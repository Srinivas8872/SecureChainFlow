import request from 'supertest';
import app from '../../app';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await disconnectDatabase();
});

describe('Authentication & RBAC API (/api/v1/auth)', () => {
  const testUser = {
    name: 'Test Supplier',
    email: 'test-supplier@chain.org',
    password: 'Password@123',
    role: 'SUPPLIER',
    organizationName: 'Test Supply Co'
  };

  let authToken = '';

  it('POST /api/v1/auth/register - successfully registers user and generates JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe('SUPPLIER');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Never expose password hash

    authToken = res.body.data.token;
  });

  it('POST /api/v1/auth/register - rejects duplicate email with 409 conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('POST /api/v1/auth/register - rejects invalid password with 422 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUser,
        email: 'another@chain.org',
        password: 'weak'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login - authenticates user and returns token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.name).toBe(testUser.name);
  });

  it('POST /api/v1/auth/login - rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword@999'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me - returns user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.organizationId).toBeDefined();
  });

  it('GET /api/v1/auth/me - rejects request without token with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
