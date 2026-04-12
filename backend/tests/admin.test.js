const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Order = require('../models/Order');
const { ROLES } = require('../utils/constants');

const MONGO_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/medilink_test';

jest.setTimeout(20000);

let adminToken;
let patientToken;
let patientUserId;
let patientId;
let orderId;

const shippingAddress = {
  name: 'Admin Managed Patient',
  phone: '+911234567890',
  street: '45 Admin Road',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  pincode: '110001',
};

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    role: ROLES.ADMIN,
  });
  adminToken = admin.getSignedToken();

  const patientRes = await request(app).post('/api/auth/register').send({
    name: 'Admin Managed Patient',
    email: 'admin.patient@test.com',
    password: 'password123',
    role: 'patient',
  });
  patientToken = patientRes.body.data.token;
  patientUserId = patientRes.body.data.user._id;

  const patient = await Patient.findOne({ userId: patientUserId });
  patientId = patient._id.toString();

  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${patientToken}`)
    .send({
      items: [{ name: 'Bandage', quantity: 2, unitPrice: 20 }],
      shippingAddress,
    });
  orderId = orderRes.body.data._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Admin user controls', () => {
  it('lists users for admins only', async () => {
    const adminRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body.data.length).toBeGreaterThanOrEqual(2);

    const patientRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(patientRes.statusCode).toBe(403);
  });

  it('creates an admin user', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Second Admin',
        email: 'second.admin@test.com',
        password: 'password123',
        role: 'admin',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('updates and deactivates a user', async () => {
    const updateRes = await request(app)
      .put(`/api/admin/users/${patientUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Patient', isEmailVerified: true });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.user.name).toBe('Updated Patient');
    expect(updateRes.body.data.user.isEmailVerified).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/admin/users/${patientUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.data.isActive).toBe(false);
  });

  it('restores a deactivated user', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${patientUserId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('Admin order controls', () => {
  it('lists and filters orders', async () => {
    const res = await request(app)
      .get(`/api/admin/orders?patientId=${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(orderId);
  });

  it('updates order status and payment status', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing', paymentStatus: 'paid', note: 'Payment confirmed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('processing');
    expect(res.body.data.paymentStatus).toBe('paid');
  });

  it('cancels a refundable order', async () => {
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Inventory issue' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.paymentStatus).toBe('refunded');

    const order = await Order.findById(orderId);
    expect(order.cancellationReason).toBe('Inventory issue');
  });
});
