import request from 'supertest';
import app from '../../app';

describe('GET /api/v1/health', () => {
  it('returns 200 and healthy status payload', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('securechainflow-backend');
    expect(res.body.data.integrations).toBeDefined();
    expect(res.body.data.integrations.blockchain.chaincode).toBe('securechainflow');
  });

  it('returns standardized 404 for unknown endpoint', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
