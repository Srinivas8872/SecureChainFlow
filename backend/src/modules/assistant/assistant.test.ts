import request from 'supertest';
import app from '../../app';

describe('Consortium AI Assistant API (/api/v1/assistant)', () => {
  it('POST /api/v1/assistant/query - returns role summary and actions for SUPPLIER', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/query')
      .send({
        role: 'SUPPLIER',
        query: 'What are my responsibilities?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('SUPPLIER');
    expect(res.body.data.response).toContain('Supplier');
    expect(Array.isArray(res.body.data.suggestedActions)).toBe(true);
    expect(Array.isArray(res.body.data.suggestedQuestions)).toBe(true);
  });

  it('POST /api/v1/assistant/query - answers batch creation questions with direct routes', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/query')
      .send({
        role: 'SUPPLIER',
        query: 'How do I register a batch?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.response).toContain('register a batch');
  });

  it('POST /api/v1/assistant/query - provides role-specific guidance for TRANSPORTER', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/query')
      .send({
        role: 'TRANSPORTER',
        query: 'What should I do?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('TRANSPORTER');
    expect(res.body.data.response).toContain('Transporter');
  });
});
