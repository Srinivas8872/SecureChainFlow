import request from 'supertest';
import app from '../../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { Product } from '../../models/Product';
import { Batch } from '../../models/Batch';

describe('Products & Batches API (/api/v1/products & /api/v1/batches)', () => {
  let supplierToken = '';
  let transporterToken = '';
  let supplierOrgId = '';
  let testProductId = '';

  beforeAll(async () => {
    await connectDatabase();

    // Setup Supplier User & Org
    const sRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Supplier Joe',
      email: 'joe-supplier@farm.org',
      password: 'Password@123',
      role: 'SUPPLIER',
      organizationName: 'Salinas Valley Farms'
    });
    supplierToken = sRes.body.data.token;
    supplierOrgId = sRes.body.data.user.organizationId;

    // Setup Transporter User
    const tRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Transporter Tim',
      email: 'tim-transporter@speedy.com',
      password: 'Password@123',
      role: 'TRANSPORTER',
      organizationName: 'Speedy Haulers'
    });
    transporterToken = tRes.body.data.token;
  });

  afterAll(async () => {
    await Batch.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    await disconnectDatabase();
  });

  describe('Product Templates', () => {
    it('POST /api/v1/products - allows SUPPLIER to create product template', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: 'Organic Hass Avocados',
          category: 'Produce',
          description: 'Export Grade Premium Avocados',
          sku: 'AVO-HASS-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Organic Hass Avocados');
      expect(res.body.data.ownerOrganizationId).toBeDefined();

      testProductId = res.body.data.id;
    });

    it('POST /api/v1/products - rejects creation from unauthorized role (TRANSPORTER)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${transporterToken}`)
        .send({
          name: 'Unauthorized Item',
          category: 'Test'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('GET /api/v1/products - lists product templates with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeDefined();
    });
  });

  describe('Batch Registration & Verification', () => {
    const validBatch = {
      batchCode: 'AVO-2026-LOT-01',
      source: 'Block 4, Greenfield Ranch, Salinas, CA',
      quantity: 500,
      unit: 'CRATES',
      manufactureDate: '2026-10-24T00:00:00.000Z',
      expiryDate: '2026-11-24T00:00:00.000Z'
    };

    let createdBatchId = '';

    it('POST /api/v1/batches - registers unique batch with canonical payload hash', async () => {
      const res = await request(app)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          ...validBatch,
          productId: testProductId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batchCode).toBe(validBatch.batchCode);
      expect(res.body.data.payloadHash).toBeDefined();
      expect(res.body.data.payloadHash.length).toBe(64); // SHA-256 64 hex characters
      expect(res.body.data.verificationToken).toBeDefined();
      expect(res.body.data.status).toBe('REGISTERED');

      createdBatchId = res.body.data.id;
    });

    it('POST /api/v1/batches - rejects duplicate batchCode with 409 conflict', async () => {
      const res = await request(app)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          ...validBatch,
          productId: testProductId
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_BATCH_CODE');
    });

    it('POST /api/v1/batches - rejects invalid date ordering (expiry before manufacture)', async () => {
      const res = await request(app)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          batchCode: 'AVO-FAIL-DATE',
          productId: testProductId,
          source: 'Field X',
          quantity: 100,
          unit: 'KG',
          manufactureDate: '2026-10-24T00:00:00.000Z',
          expiryDate: '2026-10-20T00:00:00.000Z' // Earlier than manufacture!
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/batches/:id - retrieves batch details with generated QR data URL', async () => {
      const res = await request(app)
        .get(`/api/v1/batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batchCode).toBe(validBatch.batchCode);
      expect(res.body.data.qrDataUrl).toBeDefined();
      expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(res.body.data.verificationUrl).toContain(res.body.data.verificationToken);
    });
  });
});
