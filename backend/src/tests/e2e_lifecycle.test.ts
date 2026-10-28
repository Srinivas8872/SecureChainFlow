import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Batch } from '../models/Batch';
import { SupplyChainEvent } from '../models/SupplyChainEvent';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let mongoServer: MongoMemoryServer;

// Tokens for various consortium participants
let supplierToken: string;
let processorToken: string;
let transporterToken: string;
let warehouseToken: string;
let retailerToken: string;

// Entity IDs
let supplierOrgId: string;
let processorOrgId: string;
let transporterOrgId: string;
let warehouseOrgId: string;
let retailerOrgId: string;

let supplierUserId: string;
let processorUserId: string;
let transporterUserId: string;
let warehouseUserId: string;
let retailerUserId: string;

let productId: string;
let batchId: string;
let batchCode = 'E2E-COFFEE-001';
let verificationToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // 1. Create Consortium Organizations
  const supplierOrg = await Organization.create({
    name: 'Highland Coffee Estate',
    type: 'SUPPLIER',
    status: 'VERIFIED',
    contactEmail: 'supplier@highland.com',
  });
  supplierOrgId = supplierOrg._id.toString();

  const processorOrg = await Organization.create({
    name: 'Artisan Roast Works',
    type: 'MANUFACTURER',
    status: 'VERIFIED',
    contactEmail: 'processor@artisan.com',
  });
  processorOrgId = processorOrg._id.toString();

  const transporterOrg = await Organization.create({
    name: 'ColdChain Express Logistics',
    type: 'LOGISTICS',
    status: 'VERIFIED',
    contactEmail: 'dispatch@coldchain.com',
  });
  transporterOrgId = transporterOrg._id.toString();

  const warehouseOrg = await Organization.create({
    name: 'Metro Cold Storage Hub',
    type: 'WAREHOUSING',
    status: 'VERIFIED',
    contactEmail: 'ops@metrocold.com',
  });
  warehouseOrgId = warehouseOrg._id.toString();

  const retailerOrg = await Organization.create({
    name: 'Global Gourmet Supermarkets',
    type: 'RETAIL',
    status: 'VERIFIED',
    contactEmail: 'orders@globalgourmet.com',
  });
  retailerOrgId = retailerOrg._id.toString();

  // 2. Create Consortium Users
  const supplierUser = await User.create({
    name: 'Carlos Estate Manager',
    email: 'carlos@highland.com',
    passwordHash: 'dummy_hash',
    role: 'SUPPLIER',
    organizationId: supplierOrg._id,
    status: 'ACTIVE',
  });
  supplierUserId = supplierUser._id.toString();

  const processorUser = await User.create({
    name: 'Elena Quality Inspector',
    email: 'elena@artisan.com',
    passwordHash: 'dummy_hash',
    role: 'PROCESSOR',
    organizationId: processorOrg._id,
    status: 'ACTIVE',
  });
  processorUserId = processorUser._id.toString();

  const transporterUser = await User.create({
    name: 'David Fleet Driver',
    email: 'david@coldchain.com',
    passwordHash: 'dummy_hash',
    role: 'TRANSPORTER',
    organizationId: transporterOrg._id,
    status: 'ACTIVE',
  });
  transporterUserId = transporterUser._id.toString();

  const warehouseUser = await User.create({
    name: 'Frank Warehouse Supervisor',
    email: 'frank@metrocold.com',
    passwordHash: 'dummy_hash',
    role: 'WAREHOUSE',
    organizationId: warehouseOrg._id,
    status: 'ACTIVE',
  });
  warehouseUserId = warehouseUser._id.toString();

  const retailerUser = await User.create({
    name: 'Grace Store Manager',
    email: 'grace@globalgourmet.com',
    passwordHash: 'dummy_hash',
    role: 'RETAILER',
    organizationId: retailerOrg._id,
    status: 'ACTIVE',
  });
  retailerUserId = retailerUser._id.toString();

  // 3. Issue Signed JWTs
  supplierToken = jwt.sign(
    { userId: supplierUserId, role: 'SUPPLIER', organizationId: supplierOrgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  processorToken = jwt.sign(
    { userId: processorUserId, role: 'PROCESSOR', organizationId: processorOrgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  transporterToken = jwt.sign(
    { userId: transporterUserId, role: 'TRANSPORTER', organizationId: transporterOrgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  warehouseToken = jwt.sign(
    { userId: warehouseUserId, role: 'WAREHOUSE', organizationId: warehouseOrgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  retailerToken = jwt.sign(
    { userId: retailerUserId, role: 'RETAILER', organizationId: retailerOrgId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('SecureChainFlow End-to-End Supply Chain Lifecycle & Hardening (Phase 9)', () => {
  // -------------------------------------------------------------------------
  // 1. PRODUCT CREATION & RBAC PERMISSION CHECKS
  // -------------------------------------------------------------------------
  describe('Step 1: Product Master Template Registration', () => {
    it('SUPPLIER successfully registers a new product master template', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: 'Organic Arabica Grade 1',
          category: 'COFFEE',
          sku: 'COFFEE-ARA-001',
          description: 'Single-origin washed arabica coffee beans',
          minTemperature: 15,
          maxTemperature: 25,
          maxHumidity: 65,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Organic Arabica Grade 1');
      productId = res.body.data.id || res.body.data._id;
    });

    it('TRANSPORTER is rejected from creating a product template (RBAC enforcement)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${transporterToken}`)
        .send({
          name: 'Unauthorized Product Template',
          category: 'COFFEE',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. BATCH GENESIS & BLOCKCHAIN NOTARIZATION
  // -------------------------------------------------------------------------
  describe('Step 2: Batch Genesis Registration', () => {
    it('SUPPLIER registers batch, generates verification token, and commits genesis event', async () => {
      const res = await request(app)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          batchCode,
          productId,
          source: 'Estate Parcel 14, Altitude 1800m',
          quantity: 2500,
          unit: 'KG',
          manufactureDate: '2025-03-01T08:00:00.000Z',
          expiryDate: '2026-03-01T08:00:00.000Z',
          initialLocation: 'Highland Farm Gate',
          initialFacility: 'Estate Processing Mill',
          temperature: 20.5,
          humidity: 50.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const batchData = res.body.data;
      batchId = batchData.id || batchData._id;
      verificationToken = batchData.verificationToken;

      expect(batchData.batchCode).toBe(batchCode);
      expect(batchData.status).toBe('REGISTERED');
      expect(batchData.verificationToken).toBeDefined();
      expect(batchData.blockchainStatus).toBe('LOCAL_DEMO');

      // Genesis event registration
      const genesisRes = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          eventType: 'REGISTERED',
          location: 'Highland Farm Gate',
          facility: 'Estate Processing Mill',
          temperature: 20.5,
          humidity: 50.0,
          idempotencyKey: 'idemp-genesis-001',
        });

      expect(genesisRes.status).toBe(201);
      expect(genesisRes.body.data.eventType).toBe('REGISTERED');
      expect(genesisRes.body.data.txId).toBeDefined();
    });

    it('Rejects duplicate batchCode registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          batchCode, // Duplicate
          productId,
          source: 'Another Farm',
          quantity: 500,
          unit: 'KG',
          manufactureDate: '2025-03-01T08:00:00.000Z',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. MULTI-HOP CUSTODY EVENT TRANSITIONS & LEDGER COMMITS
  // -------------------------------------------------------------------------
  describe('Step 3: Multi-Party Custody & Telemetry Transitions', () => {
    it('PROCESSOR logs QUALITY_CHECKED event with inspection telemetry', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${processorToken}`)
        .send({
          eventType: 'QUALITY_CHECKED',
          location: 'Artisan Roast Works Quality Lab',
          facility: 'Lab A',
          temperature: 19.8,
          humidity: 48.0,
          notes: 'Moisture content tested at 11.2%, grade approved',
          idempotencyKey: 'idemp-quality-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('QUALITY_CHECKED');
      expect(res.body.data.blockchainStatus).toBe('LOCAL_DEMO');
      expect(res.body.data.txId).toBeDefined();
    });

    it('SUPPLIER logs DISPATCHED event', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          eventType: 'DISPATCHED',
          location: 'Highland Logistics Dock',
          facility: 'Dock 3',
          temperature: 21.0,
          humidity: 52.0,
          idempotencyKey: 'idemp-dispatch-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('DISPATCHED');
    });

    it('TRANSPORTER logs IN_TRANSIT event with reefer container telemetry', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${transporterToken}`)
        .send({
          eventType: 'IN_TRANSIT',
          location: 'Expressway Highway 48, Mile 120',
          facility: 'Reefer Truck #402',
          temperature: 22.0,
          humidity: 55.0,
          idempotencyKey: 'idemp-transit-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('IN_TRANSIT');
    });

    it('WAREHOUSE logs RECEIVED event and assumes custody', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          eventType: 'RECEIVED',
          location: 'Metro Cold Storage Inbound Bay',
          facility: 'Bay 7',
          temperature: 18.5,
          humidity: 45.0,
          idempotencyKey: 'idemp-receive-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('RECEIVED');
    });

    it('WAREHOUSE logs STORED event in climate-controlled silo', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          eventType: 'STORED',
          location: 'Metro Cold Storage Unit B',
          facility: 'Cold Silo 12',
          temperature: 17.5,
          humidity: 42.0,
          idempotencyKey: 'idemp-store-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('STORED');
    });

    it('RETAILER logs DELIVERED event completing the custody chain', async () => {
      const res = await request(app)
        .post(`/api/v1/batches/${batchId}/events`)
        .set('Authorization', `Bearer ${retailerToken}`)
        .send({
          eventType: 'DELIVERED',
          location: 'Global Gourmet Flagship Store',
          facility: 'Retail Receiving Dock',
          temperature: 19.0,
          humidity: 46.0,
          idempotencyKey: 'idemp-deliver-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('DELIVERED');
    });
  });

  // -------------------------------------------------------------------------
  // 4. PUBLIC QR VERIFICATION & PRIVACY BOUNDARY AUDIT
  // -------------------------------------------------------------------------
  describe('Step 4: Public QR Verification & Zero-Leakage Privacy Audit', () => {
    it('Verifies full 7-event custody chain without authentication', async () => {
      const res = await request(app).get(`/api/v1/verify/${verificationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Verify batch header
      expect(data.batchCode).toBe(batchCode);
      expect(data.verificationToken).toBe(verificationToken);
      expect(data.product.name).toBe('Organic Arabica Grade 1');

      // Verify entire event history is present and in chronological order
      expect(data.eventChain).toHaveLength(7);
      const types = data.eventChain.map((e: any) => e.eventType);
      expect(types).toEqual([
        'REGISTERED',
        'QUALITY_CHECKED',
        'DISPATCHED',
        'IN_TRANSIT',
        'RECEIVED',
        'STORED',
        'DELIVERED',
      ]);

      // Verify cryptographic integrity score
      expect(data.integrity).toBeDefined();
      expect(data.integrity.verified).toBe(true);
      expect(data.integrity.score).toBe(100);
      expect(data.integrity.totalEvents).toBe(7);
      expect(data.integrity.hashMatches).toBe(7);
      expect(data.integrity.hashMismatches).toBe(0);

      // Verify privacy boundaries: NO internal mongo IDs, user emails, or hashes leak in public consumer view
      data.eventChain.forEach((event: any) => {
        expect(event.actorId).toBeUndefined();
        expect(event.passwordHash).toBeUndefined();
        expect(event.recordedBy?.email).toBeUndefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 5. SECURITY ATTACK SIMULATION: DATA TAMPERING DETECTION
  // -------------------------------------------------------------------------
  describe('Step 5: Hostile Attack Simulation & Tamper Detection', () => {
    it('Detects off-chain database tampering and lowers integrity score', async () => {
      // Direct unauthorized database tampering: simulate an attacker altering an event's telemetry
      // without updating the canonical SHA-256 payload hash
      await SupplyChainEvent.updateOne(
        { batchId, eventType: 'IN_TRANSIT' },
        { $set: { location: 'Attacker Forged Location, Nowhere' } }
      );

      // Consumer verifies via QR
      const res = await request(app).get(`/api/v1/verify/${verificationToken}`);
      expect(res.status).toBe(200);
      const data = res.body.data;

      // Cryptographic verification detects the hash mismatch
      expect(data.integrity.verified).toBe(false);
      expect(data.integrity.score).toBeLessThan(100);
      expect(data.integrity.hashMatches).toBe(6);
      expect(data.integrity.hashMismatches).toBe(1);

      // Restore data integrity for downstream tests
      const event = await SupplyChainEvent.findOne({ batchId, eventType: 'IN_TRANSIT' });
      if (event) {
        event.location = 'Expressway Highway 48, Mile 120';
        await event.save();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. AI QUALITY & ANOMALY RISK EVALUATION
  // -------------------------------------------------------------------------
  describe('Step 6: AI Predictive Risk Scoring on Multi-Hop Batch', () => {
    it('Evaluates batch risk score with multi-event telemetry signals', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/risk?batchId=${batchId}`)
        .set('Authorization', `Bearer ${retailerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.batchId).toBe(batchId);
      expect(data.batchCode).toBe(batchCode);
      expect(typeof data.riskScore).toBe('number');
      expect(data.riskScore).toBeGreaterThanOrEqual(0);
      expect(data.riskScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(data.riskLevel);
      expect(Array.isArray(data.anomalies)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. NEGATIVE SECURITY & BOUNDARY TESTS
  // -------------------------------------------------------------------------
  describe('Step 7: Negative Security & Boundary Verification', () => {
    it('Rejects invalid state transition leap (REGISTERED -> DELIVERED)', async () => {
      // Create a fresh batch to test invalid jump
      const freshBatch = await Batch.create({
        batchCode: 'INVALID-LEAP-001',
        productId,
        organizationId: supplierOrgId,
        currentCustodianId: supplierOrgId,
        source: 'Test Source',
        quantity: 100,
        unit: 'KG',
        manufactureDate: new Date(),
        createdBy: supplierUserId,
      });

      // Try jumping directly to DELIVERED
      const res = await request(app)
        .post(`/api/v1/batches/${freshBatch._id}/events`)
        .set('Authorization', `Bearer ${retailerToken}`)
        .send({
          eventType: 'DELIVERED',
          location: 'Retail Store',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Rejects requests without authorization token on protected routes', async () => {
      const res = await request(app).get('/api/v1/analytics/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Rejects requests with forged/tampered JWT signatures', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
