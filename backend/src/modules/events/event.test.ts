import request from 'supertest';
import app from '../../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { Product } from '../../models/Product';
import { Batch } from '../../models/Batch';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';

describe('Supply-Chain Events & State Machine API (/api/v1/batches/:batchId/events)', () => {
  let supplierToken = '';
  let processorToken = '';
  let transporterToken = '';
  let retailerToken = '';

  let testBatchId = '';

  beforeAll(async () => {
    await connectDatabase();

    // Setup Supplier
    const sRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Supplier Sam',
      email: 'sam@agrifarm.org',
      password: 'Password@123',
      role: 'SUPPLIER',
      organizationName: 'AgriFarm Ltd'
    });
    supplierToken = sRes.body.data.token;

    // Setup Processor
    const pRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Processor Pete',
      email: 'pete@apexpro.com',
      password: 'Password@123',
      role: 'PROCESSOR',
      organizationName: 'Apex Processing Corp'
    });
    processorToken = pRes.body.data.token;

    // Setup Transporter
    const tRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Transporter Tom',
      email: 'tom@swiftcargo.com',
      password: 'Password@123',
      role: 'TRANSPORTER',
      organizationName: 'Swift Cargo Express'
    });
    transporterToken = tRes.body.data.token;

    // Setup Retailer
    const rRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Retailer Ray',
      email: 'ray@supermart.com',
      password: 'Password@123',
      role: 'RETAILER',
      organizationName: 'SuperMart Stores'
    });
    retailerToken = rRes.body.data.token;

    // Create Product
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        name: 'Fresh Premium Blueberries',
        category: 'Fresh Berries',
        sku: 'BERRY-01'
      });

    // Create Initial Batch (in REGISTERED state)
    const batchRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        batchCode: 'BERRY-2026-LOT-09',
        productId: prodRes.body.data.id,
        source: 'Blueberry Ridge Farm, Oregon',
        quantity: 1200,
        unit: 'KG',
        manufactureDate: '2026-10-24T00:00:00.000Z'
      });

    testBatchId = batchRes.body.data.id;
  }, 30000);

  afterAll(async () => {
    await SupplyChainEvent.deleteMany({});
    await Batch.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    await disconnectDatabase();
  });

  it('POST /api/v1/batches/:batchId/events - rejects unauthorized role for event type', async () => {
    // Retailer tries to record QUALITY_CHECKED
    const res = await request(app)
      .post(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${retailerToken}`)
      .send({
        eventType: 'QUALITY_CHECKED',
        notes: 'Unauthorized inspection attempt'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_EVENT_ROLE');
  });

  it('POST /api/v1/batches/:batchId/events - rejects invalid state transition (cannot leap REGISTERED -> DELIVERED)', async () => {
    const res = await request(app)
      .post(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${retailerToken}`)
      .send({
        eventType: 'DELIVERED',
        notes: 'Cannot deliver directly from farm registration'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('POST /api/v1/batches/:batchId/events - permits valid transition REGISTERED -> QUALITY_CHECKED by PROCESSOR', async () => {
    const res = await request(app)
      .post(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${processorToken}`)
      .send({
        eventType: 'QUALITY_CHECKED',
        facility: 'Apex Lab 01',
        temperature: 3.5,
        humidity: 85,
        notes: 'Quality inspection passed: Grade A certification issued',
        idempotencyKey: 'idemp-qc-001'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eventType).toBe('QUALITY_CHECKED');
    expect(res.body.data.payloadHash).toBeDefined();
    expect(res.body.data.payloadHash.length).toBe(64);
    expect(res.body.data.temperature).toBe(3.5);

    // Verify batch status was updated to QUALITY_APPROVED
    const batchRes = await request(app)
      .get(`/api/v1/batches/${testBatchId}`)
      .set('Authorization', `Bearer ${processorToken}`);
    expect(batchRes.body.data.status).toBe('QUALITY_APPROVED');
  });

  it('POST /api/v1/batches/:batchId/events - idempotently replays when duplicate idempotencyKey sent', async () => {
    const res = await request(app)
      .post(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${processorToken}`)
      .send({
        eventType: 'QUALITY_CHECKED',
        facility: 'Apex Lab 01',
        temperature: 3.5,
        idempotencyKey: 'idemp-qc-001'
      });

    expect(res.status).toBe(200); // 200 OK replay (not 201 Created again)
    expect(res.body.success).toBe(true);
    expect(res.body.data.idempotencyKey).toBe('idemp-qc-001');

    // Total events for this batch should remain exactly 1
    const count = await SupplyChainEvent.countDocuments({ batchId: testBatchId });
    expect(count).toBe(1);
  });

  it('POST /api/v1/batches/:batchId/events - permits DISPATCHED event by SUPPLIER', async () => {
    const res = await request(app)
      .post(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        eventType: 'DISPATCHED',
        facility: 'AgriFarm Loading Dock 3',
        notes: 'Dispatched to refrigerated transport',
        temperature: 4.0
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eventType).toBe('DISPATCHED');

    // Batch status now IN_TRANSIT
    const batchRes = await request(app)
      .get(`/api/v1/batches/${testBatchId}`)
      .set('Authorization', `Bearer ${supplierToken}`);
    expect(batchRes.body.data.status).toBe('IN_TRANSIT');
  });

  it('GET /api/v1/batches/:batchId/events - lists all events chronologically', async () => {
    const res = await request(app)
      .get(`/api/v1/batches/${testBatchId}/events`)
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].eventType).toBe('QUALITY_CHECKED');
    expect(res.body.data[1].eventType).toBe('DISPATCHED');
  });
});
