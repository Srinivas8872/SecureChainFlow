'use strict';

const { Contract } = require('fabric-contract-api');

class SecureChainFlowContract extends Contract {

  async initLedger(ctx) {
    console.info('============= SecureChainFlow Ledger Initialized =============');
  }

  /**
   * Record a supply chain event on the immutable ledger
   */
  async recordEvent(ctx, eventId, batchId, eventType, actorId, organizationId, payloadHash, timestamp) {
    if (!eventId || !batchId || !payloadHash) {
      throw new Error('Missing required arguments: eventId, batchId, and payloadHash are mandatory.');
    }

    const eventKey = ctx.stub.createCompositeKey('Event', [batchId, eventId]);
    const existingAsBytes = await ctx.stub.getState(eventKey);
    if (existingAsBytes && existingAsBytes.length > 0) {
      throw new Error(`Event ${eventId} already exists for batch ${batchId}. Duplicate submission rejected.`);
    }

    const txId = ctx.stub.getTxID();
    const eventRecord = {
      docType: 'supplyChainEvent',
      eventId,
      batchId,
      eventType,
      actorId,
      organizationId,
      payloadHash,
      timestamp,
      txId,
      recordedAt: new Date((ctx.stub.getTxTimestamp().seconds.low) * 1000).toISOString()
    };

    await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(eventRecord)));
    await ctx.stub.setEvent('EventRecorded', Buffer.from(JSON.stringify({ eventId, batchId, txId })));

    return JSON.stringify(eventRecord);
  }

  /**
   * Verify integrity of an off-chain payload by checking against the committed on-chain hash
   */
  async verifyEventHash(ctx, batchId, eventId, submittedHash) {
    const eventKey = ctx.stub.createCompositeKey('Event', [batchId, eventId]);
    const recordBytes = await ctx.stub.getState(eventKey);
    if (!recordBytes || recordBytes.length === 0) {
      return JSON.stringify({
        verified: false,
        reason: 'EVENT_NOT_FOUND_ON_CHAIN',
        eventId,
        batchId
      });
    }

    const record = JSON.parse(recordBytes.toString());
    const isMatch = record.payloadHash.toLowerCase() === submittedHash.toLowerCase();

    return JSON.stringify({
      verified: isMatch,
      committedHash: record.payloadHash,
      submittedHash,
      txId: record.txId,
      recordedAt: record.recordedAt,
      reason: isMatch ? 'INTEGRITY_CONFIRMED' : 'HASH_MISMATCH_TAMPER_DETECTED'
    });
  }

  /**
   * Query all events recorded for a given batch ID
   */
  async queryEventsByBatch(ctx, batchId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('Event', [batchId]);
    const allResults = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString('utf8'));
          allResults.push(record);
        } catch (err) {
          console.error(err);
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(allResults);
  }
}

module.exports = SecureChainFlowContract;
