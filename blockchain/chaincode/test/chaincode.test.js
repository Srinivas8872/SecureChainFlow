'use strict';

jest.mock('fabric-contract-api', () => ({
  Contract: class MockContract {},
}), { virtual: true });

const SecureChainFlowContract = require('../index');

describe('SecureChainFlow Smart Contract Unit Tests', () => {
  let contract;
  let mockCtx;
  let mockStub;
  let ledgerState;

  beforeEach(() => {
    contract = new SecureChainFlowContract();
    ledgerState = new Map();

    mockStub = {
      createCompositeKey: jest.fn((prefix, attrs) => `${prefix}~${attrs.join('~')}`),
      getState: jest.fn(async (key) => {
        const val = ledgerState.get(key);
        return val ? Buffer.from(val) : Buffer.from('');
      }),
      putState: jest.fn(async (key, value) => {
        ledgerState.set(key, value.toString());
      }),
      setEvent: jest.fn(async (_eventName, _payload) => {}),
      getTxID: jest.fn(() => 'test-fabric-tx-12345'),
      getTxTimestamp: jest.fn(() => ({ seconds: { low: 1735689600 } })), // 2025-01-01T00:00:00Z
      getStateByPartialCompositeKey: jest.fn(async (_prefix, [batchId]) => {
        const matches = [];
        for (const [k, v] of ledgerState.entries()) {
          if (k.startsWith(`Event~${batchId}~`)) {
            matches.push({ value: Buffer.from(v) });
          }
        }
        let index = 0;
        return {
          next: async () => {
            if (index < matches.length) {
              const res = { value: matches[index], done: false };
              index++;
              return res;
            }
            return { done: true };
          },
          close: async () => {},
        };
      }),
    };

    mockCtx = { stub: mockStub };
  });

  it('initLedger initializes the ledger without error', async () => {
    await expect(contract.initLedger(mockCtx)).resolves.not.toThrow();
  });

  it('recordEvent successfully notarizes a valid event on ledger', async () => {
    const resString = await contract.recordEvent(
      mockCtx,
      'EVT-001',
      'BATCH-001',
      'REGISTERED',
      'user-1',
      'org-1',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '2025-01-01T00:00:00Z'
    );

    const record = JSON.parse(resString);
    expect(record.eventId).toBe('EVT-001');
    expect(record.batchId).toBe('BATCH-001');
    expect(record.payloadHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(record.txId).toBe('test-fabric-tx-12345');
    expect(mockStub.putState).toHaveBeenCalledTimes(1);
    expect(mockStub.setEvent).toHaveBeenCalledTimes(1);
  });

  it('recordEvent rejects duplicate event submission for the same batch', async () => {
    await contract.recordEvent(
      mockCtx,
      'EVT-001',
      'BATCH-001',
      'REGISTERED',
      'user-1',
      'org-1',
      'hash-abc',
      '2025-01-01T00:00:00Z'
    );

    await expect(
      contract.recordEvent(
        mockCtx,
        'EVT-001',
        'BATCH-001',
        'REGISTERED',
        'user-1',
        'org-1',
        'hash-abc',
        '2025-01-01T00:00:00Z'
      )
    ).rejects.toThrow(/already exists/);
  });

  it('recordEvent rejects missing mandatory parameters', async () => {
    await expect(
      contract.recordEvent(mockCtx, '', 'BATCH-001', 'REGISTERED', 'u', 'o', 'hash', '2025-01-01')
    ).rejects.toThrow(/Missing required arguments/);
  });

  it('verifyEventHash confirms valid committed payload hash', async () => {
    const validHash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    await contract.recordEvent(
      mockCtx,
      'EVT-100',
      'BATCH-100',
      'QUALITY_CHECKED',
      'u-2',
      'o-2',
      validHash,
      '2025-01-02T00:00:00Z'
    );

    const verificationJson = await contract.verifyEventHash(
      mockCtx,
      'BATCH-100',
      'EVT-100',
      validHash
    );

    const result = JSON.parse(verificationJson);
    expect(result.verified).toBe(true);
    expect(result.reason).toBe('INTEGRITY_CONFIRMED');
    expect(result.committedHash).toBe(validHash);
  });

  it('verifyEventHash flags mismatch when submitted hash differs from on-chain commit', async () => {
    const originalHash = '1111111111111111111111111111111111111111111111111111111111111111';
    const tamperedHash = '9999999999999999999999999999999999999999999999999999999999999999';

    await contract.recordEvent(
      mockCtx,
      'EVT-200',
      'BATCH-200',
      'DISPATCHED',
      'u-3',
      'o-3',
      originalHash,
      '2025-01-03T00:00:00Z'
    );

    const verificationJson = await contract.verifyEventHash(
      mockCtx,
      'BATCH-200',
      'EVT-200',
      tamperedHash
    );

    const result = JSON.parse(verificationJson);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('HASH_MISMATCH_TAMPER_DETECTED');
  });

  it('verifyEventHash returns EVENT_NOT_FOUND_ON_CHAIN for non-existent event', async () => {
    const verificationJson = await contract.verifyEventHash(
      mockCtx,
      'BATCH-999',
      'EVT-NONE',
      'some-hash'
    );

    const result = JSON.parse(verificationJson);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('EVENT_NOT_FOUND_ON_CHAIN');
  });

  it('queryEventsByBatch returns all chronological events for a batch', async () => {
    await contract.recordEvent(mockCtx, 'EVT-A', 'BATCH-300', 'REGISTERED', 'u', 'o', 'h1', '2025-01-01');
    await contract.recordEvent(mockCtx, 'EVT-B', 'BATCH-300', 'PROCESSED', 'u', 'o', 'h2', '2025-01-02');

    const historyJson = await contract.queryEventsByBatch(mockCtx, 'BATCH-300');
    const history = JSON.parse(historyJson);

    expect(history.length).toBe(2);
    expect(history[0].eventId).toBe('EVT-A');
    expect(history[1].eventId).toBe('EVT-B');
  });
});
