const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');

const MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/medilink_test';

jest.setTimeout(20000);

let patientToken;
let doctorToken;
let consultationId;
let doctorProfileId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const patientRes = await request(app).post('/api/auth/register').send({
    name: 'Consult Patient',
    email: 'consult.patient@test.com',
    password: 'password123',
    role: 'patient',
  });
  patientToken = patientRes.body.data.token;

  const doctorRes = await request(app).post('/api/auth/register').send({
    name: 'Dr. Consult',
    email: 'consult.doctor@test.com',
    password: 'password123',
    role: 'doctor',
    specialization: 'General Physician',
    qualification: 'MBBS',
    regNo: 'CONSULT-DR-001',
    price: 500,
  });
  doctorToken = doctorRes.body.data.token;

  const doctor = await Doctor.findOne({ userId: doctorRes.body.data.user._id });
  doctorProfileId = doctor._id.toString();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Consultation ending flow', () => {
  beforeEach(async () => {
    const startRes = await request(app)
      .post('/api/consultations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
        reason: 'Video consultation test',
      });

    consultationId = startRes.body.data._id;

    await request(app)
      .put(`/api/consultations/${consultationId}/accept`)
      .set('Authorization', `Bearer ${doctorToken}`);
  });

  afterEach(async () => {
    await Consultation.deleteMany({});
  });

  it('allows the patient to end their own active consultation', async () => {
    const res = await request(app)
      .put(`/api/consultations/${consultationId}/end`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
  });

  it('returns the existing consultation instead of a 409 on duplicate start', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
        reason: 'Retry from call button',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reused).toBe(true);
    expect(res.body.data._id).toBe(consultationId);
  });

  it('acknowledges unauthenticated leave-call requests without ending the consultation', async () => {
    const res = await request(app)
      .put(`/api/consultations/${consultationId}/leave`);

    expect(res.statusCode).toBe(202);
    expect(res.body.success).toBe(true);

    const consultation = await Consultation.findById(consultationId);
    expect(consultation.status).toBe('active');
  });

  it('returns the completed consultation on repeated end requests', async () => {
    await request(app)
      .put(`/api/consultations/${consultationId}/end`)
      .set('Authorization', `Bearer ${doctorToken}`);

    const res = await request(app)
      .put(`/api/consultations/${consultationId}/end`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('still allows the doctor to save notes while ending the consultation', async () => {
    const res = await request(app)
      .put(`/api/consultations/${consultationId}/end`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ notes: 'Patient was advised rest and hydration.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes).toBe('Patient was advised rest and hydration.');
    expect(res.body.data.status).toBe('completed');
  });
});
