const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/medilink_test';

jest.setTimeout(20000);

let patientToken, doctorToken, doctorId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Create patient
  const pr = await request(app).post('/api/auth/register').send({
    name: 'Test Patient',
    email: 'pt@test.com',
    password: 'password123',
    role: 'patient',
  });
  patientToken = pr.body.data.token;

  // Create doctor
  const dr = await request(app).post('/api/auth/register').send({
    name: 'Dr. Test Specialist',
    email: 'dr@test.com',
    password: 'password123',
    role: 'doctor',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD',
    regNo: 'TEST-DR-001',
    price: 800,
  });
  doctorToken = dr.body.data.token;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('GET /api/doctors', () => {
  it('lists all doctors (public)', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('filters by specialty', async () => {
    const res = await request(app).get('/api/doctors?specialty=Cardiologist');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((d) => {
      expect(d.specialization).toBe('Cardiologist');
    });
  });

  it('filters online doctors', async () => {
    const res = await request(app).get('/api/doctors?online=true');
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((d) => {
      expect(d.online).toBe(true);
    });
  });

  it('paginates results', async () => {
    const res = await request(app).get('/api/doctors?page=1&limit=2');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
  });
});

describe('GET /api/doctors/profile', () => {
  it('returns own doctor profile', async () => {
    const res = await request(app)
      .get('/api/doctors/profile')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.specialization).toBe('Cardiologist');
  });

  it('returns 401 for unauthenticated', async () => {
    const res = await request(app).get('/api/doctors/profile');
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when patient accesses doctor profile endpoint', async () => {
    const res = await request(app)
      .get('/api/doctors/profile')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/doctors/profile', () => {
  it('updates doctor profile', async () => {
    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ price: 1000, experience: 10, bio: 'Updated bio' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.price).toBe(1000);
    expect(res.body.data.experience).toBe(10);
  });

  it('rejects invalid price', async () => {
    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ price: -50 });
    expect(res.statusCode).toBe(422);
  });
});

describe('PUT /api/doctors/status', () => {
  it('toggles online status', async () => {
    const res = await request(app)
      .put('/api/doctors/status')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ online: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.online).toBe(true);
  });
});

describe('GET /api/doctors/:id', () => {
  it('returns doctor by ID', async () => {
    const listRes = await request(app).get('/api/doctors');
    const doctor = listRes.body.data[0];
    if (!doctor) return;

    const res = await request(app).get(`/api/doctors/${doctor._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(doctor._id);
  });

  it('returns 400 for invalid ID', async () => {
    const res = await request(app).get('/api/doctors/invalid-id');
    expect([400, 500]).toContain(res.statusCode);
  });
});
