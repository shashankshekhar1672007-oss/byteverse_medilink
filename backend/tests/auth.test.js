const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/medilink_test';

jest.setTimeout(20000);

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
  await Patient.deleteMany({});
  await Doctor.deleteMany({});
});

describe('POST /api/auth/register', () => {
  it('registers a patient successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Patient',
      email: 'testpatient@test.com',
      password: 'password123',
      role: 'patient',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('patient');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('registers a doctor with required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dr. Test',
      email: 'testdoctor@test.com',
      password: 'password123',
      role: 'doctor',
      specialization: 'Cardiologist',
      qualification: 'MBBS, MD',
      regNo: 'TEST-001',
      price: 500,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.role).toBe('doctor');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'dup@test.com',
      password: 'password123',
      role: 'patient',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'dup@test.com',
      password: 'password456',
      role: 'patient',
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad User',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad User',
      email: 'bad@test.com',
      password: '123',
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects doctor without required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Incomplete Doc',
      email: 'incomplete@test.com',
      password: 'password123',
      role: 'doctor',
    });
    expect([400, 422]).toContain(res.statusCode);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User',
      email: 'loginuser@test.com',
      password: 'password123',
      role: 'patient',
    });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'loginuser@test.com',
      password: 'password123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'loginuser@test.com',
      password: 'wrongpassword',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.com',
      password: 'password123',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Me User',
      email: 'meuser@test.com',
      password: 'password123',
      role: 'patient',
    });
    token = res.body.data.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe('meuser@test.com');
  });

  it('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/health', () => {
  it('returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
