#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { randomUUID } = require('crypto'); // ✅ IMPORTANT

// ✅ ADD HERE
const generateRoomId = () => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `room-${ts}-${rand}`;
};
  

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Prescription = require('./models/Prescription');
const Consultation = require('./models/Consultation');
const Message = require('./models/Message');
const Order = require('./models/Order');

const { users, patientProfiles, doctorProfiles } = require('./utils/seed');

// ── DB CONNECT ────────────────────────────────────────────────────────────────
const connect = async () => {
  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medilink'
  );
  console.log('MongoDB connected for seeding');
};

// ── GENERATORS ────────────────────────────────────────────────────────────────
const generateRxId = () =>
  `RX-${randomUUID().slice(0, 8).toUpperCase()}`;

// ── SEED DATA ─────────────────────────────────────────────────────────────────
const seedData = async () => {
  console.log('Seeding database...');

  // Users
  const insertedUsers = await User.insertMany(users);
  console.log(`Inserted ${insertedUsers.length} users`);

  const userIds = insertedUsers.map((u) => u._id);

  // Patients
  const insertedPatients = await Patient.insertMany(
    patientProfiles(userIds)
  );
  console.log(`Inserted ${insertedPatients.length} patients`);

  // Doctors
  const insertedDoctors = await Doctor.insertMany(
    doctorProfiles(userIds)
  );
  console.log(`Inserted ${insertedDoctors.length} doctors`);

  // ── Prescriptions (FIXED rxId) ────────────────────────────────────────────
  const prescriptions = await Prescription.insertMany([
    {
      rxId: generateRxId(),
      createdBy: insertedDoctors[0]._id,
      createdFor: insertedPatients[0]._id,
      diagnosis: 'Hypertension',
      symptoms: ['Headache', 'Dizziness'],
      medicines: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily', duration: '30 days' },
      ],
      advice: 'Exercise daily',
      status: 'active',
    },
    {
      rxId: generateRxId(),
      createdBy: insertedDoctors[1]._id,
      createdFor: insertedPatients[1]._id,
      diagnosis: 'Eczema',
      symptoms: ['Itching', 'Dry skin'],
      medicines: [
        { name: 'Hydrocortisone', dosage: 'Apply', frequency: 'Twice daily', duration: '14 days' },
      ],
      status: 'active',
    },
    {
      rxId: generateRxId(),
      createdBy: insertedDoctors[2]._id,
      createdFor: insertedPatients[2]._id,
      diagnosis: 'Diabetes',
      symptoms: ['Fatigue'],
      medicines: [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '90 days' },
      ],
      status: 'active',
    },
  ]);

  console.log(`Inserted ${prescriptions.length} prescriptions`);

  const orders = await Order.insertMany([
    {
      patient: insertedPatients[0]._id,
      prescription: prescriptions[0]._id,
      items: prescriptions[0].medicines.map((medicine) => ({
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        duration: medicine.duration,
        quantity: medicine.quantity || 1,
        unitPrice: 50,
      })),
      shippingAddress: {
        name: insertedUsers[0].name,
        phone: insertedUsers[0].phone || '+911234567890',
        street: '221 Wellness Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001',
      },
      paymentMethod: 'cod',
      status: 'pending',
      statusHistory: [{ status: 'pending', updatedBy: insertedUsers[0]._id }],
    },
  ]);

  console.log(`Inserted ${orders.length} orders`);

// ── Consultations
 const consultations = await Consultation.insertMany([
  {
    patient: insertedPatients[0]._id,
    doctor: insertedDoctors[0]._id,
    status: 'completed',
    prescription: prescriptions[0]._id,
    roomId: generateRoomId(), // ✅ ADD THIS
  },
  {
    patient: insertedPatients[1]._id,
    doctor: insertedDoctors[1]._id,
    status: 'active',
    prescription: prescriptions[1]._id,
    roomId: generateRoomId(), // ✅ ADD
  },
  {
    patient: insertedPatients[2]._id,
    doctor: insertedDoctors[2]._id,
    status: 'pending',
    roomId: generateRoomId(), // ✅ ADD
  },
]);

  // ── Messages ──────────────────────────────────────────────────────────────
  await Message.insertMany([
    {
      consultation: consultations[1]._id,
      sender: insertedUsers[1]._id,
      senderRole: 'patient',
      text: 'Hello doctor',
    },
    {
      consultation: consultations[1]._id,
      sender: insertedUsers[4]._id,
      senderRole: 'doctor',
      text: 'Hello, how can I help?',
    },
  ]);

  console.log('Inserted messages');

  console.log('✅ Seeding completed successfully');
};

// ── CLEAN DB ────────────────────────────────────────────────────────────────
const cleanData = async () => {
  console.log('Cleaning database...');
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Doctor.deleteMany({}),
    Prescription.deleteMany({}),
    Consultation.deleteMany({}),
    Message.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log('✅ Database cleared');
};

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await connect();

    const arg = process.argv[2];

    if (arg === '--seed') {
      await cleanData();
      await seedData();
    } else if (arg === '--clean') {
      await cleanData();
    } else {
      console.log('Usage: node seeder.js --seed | --clean');
    }
  } catch (err) {
    console.error(`Seeder error: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
