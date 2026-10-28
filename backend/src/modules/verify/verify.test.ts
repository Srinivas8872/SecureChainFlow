import request from 'supertest';
import app from '../../app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Batch } from '../../models/Batch';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { computeSha256 } from '../../utils/crypto';

let mongoServer: MongoMemoryServer;
let authToken: string;

let orgId: string;
let userId: string;
let batchId: string;
let productId: string;
let verificationToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create org
  const org = await Organization.create({
    name: 'Verify Test Org',
    type: 'SUPPLIER',
    status: 'VERIFIED',
    contactEmail: 'verify@test.com',
  });
  orgId = org._id.toString();

  // Create user
  const user = await User.create({
    name: 'Verify User',
    email: 'verifyuser@test.com',
    passwordHash: 'hashed_irrelevant',
    role: 'ADMIN',
    organizationId: org._id,
    status: 'ACTIVE',
  });
  userId = user._id.toString();

  authToken = jwt.sign(
    { userId, role: 'ADMIN', organizationId: orgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create product
  const product = await Product.create({
    name: 'Test Grain',
    category: 'GRAIN',
    createdBy: user._id,
    ownerOrganizationId: org._id,
  });
  productId = product._id.toString();

  // Create batch
  const batch = await Batch.create({
    batchCode: 'VFY-001',
    productId: product._id,
    organizationId: org._id,
    currentCustodianId: org._id,
    source: 'Test Farm, India',
    quantity: 500,
    unit: 'KG',
    manufactureDate: new Date('2025-01-01'),
    expiryDate: new Date('2027-01-01'),
    createdBy: user._id,
    blockchainStatus: 'LOCAL_DEMO',
  });
  batchId = batch._id.toString();
  verificationToken = batch.verificationToken;

  // Record one event
  const eventPayload = {
    batchId: batchId,
    eventType: 'REGISTERED',
    occurredAt: new Date('2025-01-01').toISOString(),
    location: 'Test Farm Gate',
    temperature: null,
    humidity: null,
  };
  const hash = computeSha256(eventPayload);

  await SupplyChainEvent.create({
    batchId: batch._id,
    eventType: 'REGISTERED',
    actorId: user._id,
    organizationId: org._id,
    location: 'Test Farm Gate',
    occurredAt: new Date('2025-01-01'),
    payloadHash: hash,
    blockchainStatus: 'LOCAL_DEMO',
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// PUBLIC VERIFY ENDPOINT
// ---------------------------------------------------------------------------
describe('GET /api/v1/verify/:token', () => {
  it('should return 400 if token is empty whitespace', async () => {
    const res = await request(app).get('/api/v1/verify/ ');
    // Trailing space in URL — either 400 or 404 is acceptable
    expect([400, 404]).toContain(res.status);
  });

  it('should return 404 for a non-existent token', async () => {
    const res = await request(app).get('/api/v1/verify/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BATCH_NOT_FOUND');
  });

  it('should return 200 with batch genealogy for a valid token', async () => {
    const res = await request(app).get(`/api/v1/verify/${verificationToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.batchCode).toBe('VFY-001');
    expect(data.verificationToken).toBe(verificationToken);
    expect(data.product).toBeDefined();
    expect(data.product.name).toBe('Test Grain');
    expect(data.eventChain).toHaveLength(1);
    expect(data.eventChain[0].eventType).toBe('REGISTERED');
    expect(data.integrity).toBeDefined();
    expect(data.integrity.totalEvents).toBe(1);
    expect(typeof data.integrity.score).toBe('number');
  });

  it('should include integrity score without requiring auth', async () => {
    // Call without any Authorization header
    const res = await request(app).get(`/api/v1/verify/${verificationToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.integrity.verified).toBeDefined();
    expect(res.headers['authorization']).toBeUndefined(); // no auth header in response
  });

  it('should enforce public privacy boundary and not leak internal Mongo IDs or passwords', async () => {
    const res = await request(app).get(`/api/v1/verify/${verificationToken}`);
    expect(res.status).toBe(200);

    const data = res.body.data;
    // Internal MongoDB _id fields should not be exposed at top-level
    expect(data._id).toBeUndefined();
    expect(data.__v).toBeUndefined();
    // Passwords or sensitive hashes should never appear
    expect(data.passwordHash).toBeUndefined();
    expect(data.password).toBeUndefined();
    // Internal user emails should not leak to public viewer
    expect(data.eventChain[0].recordedBy?.email).toBeUndefined();
  });

  it('should detect hash mismatch and report tampering in integrity score', async () => {
    // Create a batch with a tampered event
    const tamperedBatch = await Batch.create({
      batchCode: 'VFY-TAMPERED-01',
      productId: productId,
      organizationId: orgId,
      currentCustodianId: orgId,
      source: 'Compromised Facility',
      quantity: 100,
      unit: 'KG',
      manufactureDate: new Date('2025-02-01'),
      createdBy: userId,
      blockchainStatus: 'LOCAL_DEMO',
    });

    // Record event with an illegitimate hash
    await SupplyChainEvent.create({
      batchId: tamperedBatch._id,
      eventType: 'PROCESSED',
      actorId: userId,
      organizationId: orgId,
      location: 'Warehouse B',
      occurredAt: new Date('2025-02-02'),
      payloadHash: '0000000000000000000000000000000000000000000000000000000000000000', // invalid tampered hash
      blockchainStatus: 'LOCAL_DEMO',
    });

    const res = await request(app).get(`/api/v1/verify/${tamperedBatch.verificationToken}`);
    expect(res.status).toBe(200);

    const integrity = res.body.data.integrity;
    expect(integrity.verified).toBe(false);
    expect(integrity.hashMismatches).toBeGreaterThanOrEqual(1);
    expect(integrity.score).toBeLessThan(100);
  });

  it('should return event history in strict chronological order', async () => {
    const multiEventBatch = await Batch.create({
      batchCode: 'VFY-CHRONO-01',
      productId: productId,
      organizationId: orgId,
      currentCustodianId: orgId,
      source: 'Orchard Field 3',
      quantity: 250,
      unit: 'KG',
      manufactureDate: new Date('2025-03-01'),
      createdBy: userId,
      blockchainStatus: 'LOCAL_DEMO',
    });

    // Create events out-of-order in the database
    await SupplyChainEvent.create({
      batchId: multiEventBatch._id,
      eventType: 'DISPATCHED',
      actorId: userId,
      organizationId: orgId,
      occurredAt: new Date('2025-03-05T10:00:00Z'),
      payloadHash: 'hash-later',
      blockchainStatus: 'LOCAL_DEMO',
    });

    await SupplyChainEvent.create({
      batchId: multiEventBatch._id,
      eventType: 'REGISTERED',
      actorId: userId,
      organizationId: orgId,
      occurredAt: new Date('2025-03-01T08:00:00Z'),
      payloadHash: 'hash-earlier',
      blockchainStatus: 'LOCAL_DEMO',
    });

    const res = await request(app).get(`/api/v1/verify/${multiEventBatch.verificationToken}`);
    expect(res.status).toBe(200);

    const events = res.body.data.eventChain;
    expect(events.length).toBe(2);
    expect(new Date(events[0].occurredAt).getTime()).toBeLessThan(
      new Date(events[1].occurredAt).getTime()
    );
    expect(events[0].eventType).toBe('REGISTERED');
    expect(events[1].eventType).toBe('DISPATCHED');
  });
});

// ---------------------------------------------------------------------------
// ANALYTICS SUMMARY ENDPOINT
// ---------------------------------------------------------------------------
describe('GET /api/v1/analytics/summary', () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('should return analytics summary with auth', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(typeof data.totalBatches).toBe('number');
    expect(typeof data.totalEvents).toBe('number');
    expect(typeof data.blockchainCommitRate).toBe('number');
    expect(data.statusBreakdown).toBeDefined();
    expect(data.eventTypeBreakdown).toBeDefined();
    expect(data.blockchainBreakdown).toBeDefined();
    expect(data.generatedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ANALYTICS RISK ENDPOINT (GET & POST)
// ---------------------------------------------------------------------------
describe('ANALYTICS RISK API (/api/v1/analytics/risk)', () => {
  it('POST /risk - should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .send({ batchId });
    expect(res.status).toBe(401);
  });

  it('GET /risk - should return 401 without auth token', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/risk?batchId=${batchId}`);
    expect(res.status).toBe(401);
  });

  it('POST /risk - should return 400 when batchId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('GET /risk - should return 400 when batchId query parameter is missing', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('POST /risk - should return 404 for non-existent batchId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ batchId: fakeId });
    expect(res.status).toBe(404);
  });

  it('GET /risk - should return 404 for non-existent batchId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/v1/analytics/risk?batchId=${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /risk - should return risk score with heuristic fallback for a valid batch', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ batchId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.batchId).toBe(batchId);
    expect(data.batchCode).toBe('VFY-001');
    expect(typeof data.riskScore).toBe('number');
    expect(data.riskScore).toBeGreaterThanOrEqual(0);
    expect(data.riskScore).toBeLessThanOrEqual(100);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(data.riskLevel);
    expect(Array.isArray(data.anomalies)).toBe(true);
    expect(['ai_service', 'heuristic_fallback']).toContain(data.source);
    expect(data.analysedAt).toBeDefined();
  });

  it('GET /risk - should return risk score via GET with query parameter', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/risk?batchId=${batchId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.batchId).toBe(batchId);
    expect(data.batchCode).toBe('VFY-001');
    expect(typeof data.riskScore).toBe('number');
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(data.riskLevel);
  });
});
