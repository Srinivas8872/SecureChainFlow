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
    status: 'ACTIVE',
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
// ANALYTICS RISK ENDPOINT
// ---------------------------------------------------------------------------
describe('POST /api/v1/analytics/risk', () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .send({ batchId });
    expect(res.status).toBe(401);
  });

  it('should return 400 when batchId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 404 for non-existent batchId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/v1/analytics/risk')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ batchId: fakeId });
    expect(res.status).toBe(404);
  });

  it('should return risk score with heuristic fallback for a valid batch', async () => {
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
    expect(data.source).toBe('heuristic_fallback');
    expect(data.analysedAt).toBeDefined();
  });
});
