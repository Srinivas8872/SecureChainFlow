import { FabricGatewayAdapter, fabricGateway } from './fabricAdapter';
import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { Product } from '../../models/Product';
import { Batch } from '../../models/Batch';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import { AuditLog } from '../../models/AuditLog';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

describe('Hyperledger Fabric Gateway Adapter Unit & Integration Tests', () => {
  let adapter: FabricGatewayAdapter;

  beforeEach(() => {
    adapter = FabricGatewayAdapter.getInstance();
    adapter.clearDemoLedger();
  });

  describe('FabricGatewayAdapter (Unit Tests)', () => {
    const testPayload = {
      eventId: 'evt-unit-01',
      batchId: 'batch-unit-01',
      batchCode: 'LOT-FABRIC-01',
      eventType: 'REGISTERED',
      actorId: 'usr-123',
      organizationId: 'org-456',
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      occurredAt: new Date('2025-01-01T10:00:00Z'),
    };

    it('records an event in LOCAL_DEMO mode with transparent status and txId', async () => {
      const result = await adapter.recordEvent(testPayload);

      expect(result.blockchainStatus).toBe('LOCAL_DEMO');
      expect(result.txId).toMatch(/^DEMO_TX_/);
      expect(result.committedAt).toBeDefined();
      expect(result.message).toContain('mock gateway active');
    });

    it('rejects duplicate event submission for the same batchId and eventId', async () => {
      await adapter.recordEvent(testPayload);

      await expect(adapter.recordEvent(testPayload)).rejects.toThrow(/already recorded on demo ledger/);
    });

    it('throws error when mandatory fields are missing', async () => {
      await expect(
        adapter.recordEvent({ ...testPayload, eventId: '' })
      ).rejects.toThrow(/eventId, batchId, and payloadHash are mandatory/);
    });

    it('verifies matching hash with LEDGER_INTEGRITY_CONFIRMED', async () => {
      await adapter.recordEvent(testPayload);

      const verification = await adapter.verifyEvent(
        testPayload.batchId,
        testPayload.eventId,
        testPayload.payloadHash
      );

      expect(verification.verified).toBe(true);
      expect(verification.blockchainStatus).toBe('LOCAL_DEMO');
      expect(verification.reason).toBe('LEDGER_INTEGRITY_CONFIRMED');
      expect(verification.committedHash).toBe(testPayload.payloadHash);
      expect(verification.txId).toMatch(/^DEMO_TX_/);
    });

    it('flags tampering with LEDGER_HASH_MISMATCH_TAMPER_DETECTED', async () => {
      await adapter.recordEvent(testPayload);

      const tamperedHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const verification = await adapter.verifyEvent(
        testPayload.batchId,
        testPayload.eventId,
        tamperedHash
      );

      expect(verification.verified).toBe(false);
      expect(verification.reason).toBe('LEDGER_HASH_MISMATCH_TAMPER_DETECTED');
      expect(verification.committedHash).toBe(testPayload.payloadHash);
    });

    it('returns EVENT_NOT_RECORDED_ON_LEDGER for non-existent event', async () => {
      const verification = await adapter.verifyEvent(
        'batch-none',
        'evt-none',
        'some-hash'
      );

      expect(verification.verified).toBe(false);
      expect(verification.blockchainStatus).toBe('NOT_FOUND');
      expect(verification.reason).toBe('EVENT_NOT_RECORDED_ON_LEDGER');
    });

    it('queries chronological batch history from the ledger', async () => {
      await adapter.recordEvent({
        ...testPayload,
        eventId: 'evt-1',
        occurredAt: '2025-01-01T08:00:00Z',
      });
      await adapter.recordEvent({
        ...testPayload,
        eventId: 'evt-2',
        eventType: 'PROCESSED',
        payloadHash: 'hash-2',
        occurredAt: '2025-01-02T12:00:00Z',
      });

      const history = await adapter.queryBatchHistory(testPayload.batchId);
      expect(history.length).toBe(2);
      expect(history[0].eventId).toBe('evt-1');
      expect(history[1].eventId).toBe('evt-2');
    });

    it('reports network diagnostics without exposing private keys or secrets', async () => {
      const status = await adapter.getNetworkStatus();
      expect(status.channelName).toBe('mychannel');
      expect(status.chaincodeName).toBe('securechainflow');
      expect(status.mspId).toBe('Org1MSP');
      expect(status.mode).toBe('LOCAL_DEMO');
      expect(status.lastChecked).toBeDefined();
    });
  });

  describe('End-to-End API Integration with Fabric Adapter', () => {
    let mongoServer: MongoMemoryServer;
    let supplierToken: string;
    let orgId: string;
    let userId: string;
    let batchId: string;

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());

      const org = await Organization.create({
        name: 'Fabric Test Farm Co',
        type: 'SUPPLIER',
        status: 'VERIFIED',
      });
      orgId = org._id.toString();

      const user = await User.create({
        name: 'Fabric Tester',
        email: 'fabric-tester@test.com',
        passwordHash: 'dummy_hash',
        role: 'SUPPLIER',
        organizationId: org._id,
        status: 'ACTIVE',
      });
      userId = user._id.toString();

      supplierToken = jwt.sign(
        { userId, role: 'SUPPLIER', organizationId: orgId },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const product = await Product.create({
        name: 'Organic Wheat',
        category: 'GRAIN',
        createdBy: user._id,
        ownerOrganizationId: org._id,
      });

      const batch = await Batch.create({
        batchCode: 'WHEAT-FABRIC-001',
        productId: product._id,
        organizationId: org._id,
        currentCustodianId: org._id,
        source: 'Punjab, India',
        quantity: 1000,
        unit: 'KG',
        manufactureDate: new Date('2025-01-01'),
        createdBy: user._id,
        blockchainStatus: 'LOCAL_DEMO',
      });
      batchId = batch._id.toString();
    });

    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });

    it('POST /api/v1/batches/:batchId/events - commits event to Fabric adapter and stores txId and LOCAL_DEMO status', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          eventType: 'DISPATCHED',
          facility: 'Loading Silo 4',
          location: 'Punjab Gate 1',
          temperature: 18.5,
          humidity: 45,
          notes: 'Dispatched to regional distribution hub',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const eventData = res.body.data;
      expect(eventData.eventType).toBe('DISPATCHED');
      expect(eventData.blockchainStatus).toBe('LOCAL_DEMO');
      expect(eventData.txId).toMatch(/^DEMO_TX_/);

      // Verify database persistence
      const savedEvent = await SupplyChainEvent.findById(eventData.id);
      expect(savedEvent).toBeDefined();
      expect(savedEvent?.blockchainStatus).toBe('LOCAL_DEMO');
      expect(savedEvent?.txId).toBe(eventData.txId);

      // Verify batch record status update
      const updatedBatch = await Batch.findById(batchId);
      expect(updatedBatch?.blockchainStatus).toBe('LOCAL_DEMO');
      expect(updatedBatch?.txId).toBe(eventData.txId);

      // Verify audit log recorded blockchain status
      const audit = await AuditLog.findOne({
        resourceId: eventData.id,
        action: 'SUPPLY_CHAIN_EVENT_RECORDED',
      });
      expect(audit).toBeDefined();
      expect(audit?.details?.blockchainStatus).toBe('LOCAL_DEMO');
      expect(audit?.details?.txId).toBe(eventData.txId);
    });
  });
});
