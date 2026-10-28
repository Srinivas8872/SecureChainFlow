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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create organization
  const org = await Organization.create({
    name: 'Analytics Test Org',
    type: 'MANUFACTURER',
    status: 'VERIFIED',
    contactEmail: 'analytics@test.com',
  });
  orgId = org._id.toString();

  // Create user
  const user = await User.create({
    name: 'Analytics Admin',
    email: 'analyticsadmin@test.com',
    passwordHash: 'irrelevant_hash',
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
    name: 'Premium Basmati Rice',
    category: 'GRAIN',
    sku: 'RICE-001',
    createdBy: user._id,
    ownerOrganizationId: org._id,
  });
  productId = product._id.toString();

  // Create batches
  const batch1 = await Batch.create({
    batchCode: 'ANL-BATCH-001',
    productId: product._id,
    organizationId: org._id,
    currentCustodianId: org._id,
    source: 'Punjab Organic Farm',
    quantity: 1200,
    unit: 'KG',
    manufactureDate: new Date('2025-02-01'),
    expiryDate: new Date('2026-02-01'),
    createdBy: user._id,
    status: 'REGISTERED',
    blockchainStatus: 'COMMITTED',
  });
  batchId = batch1._id.toString();

  await Batch.create({
    batchCode: 'ANL-BATCH-002',
    productId: product._id,
    organizationId: org._id,
    currentCustodianId: org._id,
    source: 'Haryana Depot',
    quantity: 800,
    unit: 'KG',
    manufactureDate: new Date('2025-01-15'),
    expiryDate: new Date('2026-01-15'),
    createdBy: user._id,
    status: 'IN_TRANSIT',
    blockchainStatus: 'LOCAL_DEMO',
  });

  // Create events
  const hash1 = computeSha256({
    batchId,
    eventType: 'REGISTERED',
    occurredAt: '2025-02-01T10:00:00.000Z',
    location: 'Farm Silo A',
  });
  await SupplyChainEvent.create({
    batchId: batch1._id,
    eventType: 'REGISTERED',
    actorId: user._id,
    organizationId: org._id,
    location: 'Farm Silo A',
    facility: 'Central Warehouse',
    temperature: 21.5,
    humidity: 55,
    occurredAt: new Date('2025-02-01T10:00:00.000Z'),
    payloadHash: hash1,
    blockchainStatus: 'COMMITTED',
  });

  const hash2 = computeSha256({
    batchId,
    eventType: 'DISPATCHED',
    occurredAt: '2025-02-02T14:30:00.000Z',
    location: 'Transit Carrier 4',
  });
  await SupplyChainEvent.create({
    batchId: batch1._id,
    eventType: 'DISPATCHED',
    actorId: user._id,
    organizationId: org._id,
    location: 'Transit Carrier 4',
    temperature: 24.0,
    humidity: 60,
    occurredAt: new Date('2025-02-02T14:30:00.000Z'),
    payloadHash: hash2,
    blockchainStatus: 'LOCAL_DEMO',
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Analytics Module Integration Tests (Phase 8)', () => {
  describe('Authentication Enforcement', () => {
    it('GET /api/v1/analytics/summary - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/analytics/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/analytics/export - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/analytics/export?type=batches');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/analytics/risk - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(`/api/v1/analytics/risk?batchId=${batchId}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/summary', () => {
    it('returns aggregated KPIs and recent events stream', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Aggregated counts
      expect(data.totalBatches).toBe(2);
      expect(data.totalEvents).toBe(2);
      expect(typeof data.totalProducts).toBe('number');

      // Status breakdown
      expect(data.statusBreakdown).toBeDefined();
      expect(data.statusBreakdown['REGISTERED']).toBe(1);
      expect(data.statusBreakdown['IN_TRANSIT']).toBe(1);

      // Blockchain breakdown
      expect(data.blockchainBreakdown).toBeDefined();
      expect(data.blockchainBreakdown['COMMITTED']).toBe(1);
      expect(data.blockchainBreakdown['LOCAL_DEMO']).toBe(1);

      // Recent events stream
      expect(Array.isArray(data.recentEvents)).toBe(true);
      expect(data.recentEvents.length).toBe(2);
      expect(data.recentEvents[0].batchCode).toBeDefined();
      expect(data.recentEvents[0].eventType).toBeDefined();
      expect(data.generatedAt).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/export', () => {
    it('exports batches as CSV with proper headers and data rows', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export?type=batches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');

      const csvLines = res.text.trim().split('\n');
      expect(csvLines.length).toBeGreaterThanOrEqual(3); // header + 2 batches

      // Verify header format
      expect(csvLines[0]).toBe(
        'Batch Code,Product Name,Category,Quantity,Unit,Status,Blockchain Status,Manufacture Date,Expiry Date,Origin Organization,Current Custodian'
      );

      // Check content presence
      expect(res.text).toContain('ANL-BATCH-001');
      expect(res.text).toContain('Premium Basmati Rice');
      expect(res.text).toContain('ANL-BATCH-002');
      expect(res.text).toContain('Analytics Test Org');
    });

    it('exports events as CSV with telemetry fields and blockchain status', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export?type=events')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');

      const csvLines = res.text.trim().split('\n');
      expect(csvLines.length).toBeGreaterThanOrEqual(3); // header + 2 events

      // Verify header format
      expect(csvLines[0]).toBe(
        'Batch Code,Event Type,Occurred At,Organization,Location,Facility,Temperature,Humidity,Blockchain Status,Payload Hash'
      );

      // Check content presence
      expect(res.text).toContain('ANL-BATCH-001');
      expect(res.text).toContain('REGISTERED');
      expect(res.text).toContain('DISPATCHED');
      expect(res.text).toContain('21.5');
      expect(res.text).toContain('COMMITTED');
    });

    it('defaults to batches export when type query parameter is omitted', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Batch Code,Product Name');
    });
  });

  describe('Risk Analytics Integration', () => {
    it('GET /api/v1/analytics/risk - calculates risk score with heuristic fallback when AI service is offline', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/risk?batchId=${batchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batchId).toBe(batchId);
      expect(typeof res.body.data.riskScore).toBe('number');
      expect(res.body.data.riskLevel).toBeDefined();
      expect(Array.isArray(res.body.data.anomalies)).toBe(true);
    });

    it('POST /api/v1/analytics/risk - calculates risk score via POST request', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/risk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ batchId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batchId).toBe(batchId);
      expect(typeof res.body.data.riskScore).toBe('number');
    });
  });
});
