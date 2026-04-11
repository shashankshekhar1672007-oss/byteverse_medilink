const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS, SPECIALIZATIONS, BLOOD_GROUPS } = require('./constants');

const password = bcrypt.hashSync('pass123', BCRYPT_ROUNDS);

const users = [
  // Patients
  { name: 'Rahul Jha', email: 'patient1@medilink.com', password, role: 'patient', phone: '+919876543210', isEmailVerified: true, isActive: true },
  { name: 'Priya Sharma', email: 'patient2@medilink.com', password, role: 'patient', phone: '+919876543211', isEmailVerified: true, isActive: true },
  { name: 'Arjun Mehta', email: 'patient3@medilink.com', password, role: 'patient', phone: '+919876543212', isEmailVerified: true, isActive: true },
  // Doctors
  { name: 'Dr. Anita Desai', email: 'doctor1@medilink.com', password, role: 'doctor', phone: '+919876500001', isEmailVerified: true, isActive: true },
  { name: 'Dr. Rohan Kapoor', email: 'doctor2@medilink.com', password, role: 'doctor', phone: '+919876500002', isEmailVerified: true, isActive: true },
  { name: 'Dr. Sunita Rao', email: 'doctor3@medilink.com', password, role: 'doctor', phone: '+919876500003', isEmailVerified: true, isActive: true },
  { name: 'Dr. Vikram Singh', email: 'doctor4@medilink.com', password, role: 'doctor', phone: '+919876500004', isEmailVerified: true, isActive: true },
  { name: 'Dr. Meera Nair', email: 'doctor5@medilink.com', password, role: 'doctor', phone: '+919876500005', isEmailVerified: true, isActive: true },
];

const patientProfiles = (userIds) => [
  { userId: userIds[0], age: 32, gender: 'male', weight: 75, height: 175, bloodGroup: 'O+', allergies: ['Penicillin'], chronicConditions: ['Hypertension'] },
  { userId: userIds[1], age: 27, gender: 'female', weight: 58, height: 163, bloodGroup: 'A+', allergies: [], chronicConditions: [] },
  { userId: userIds[2], age: 45, gender: 'male', weight: 85, height: 180, bloodGroup: 'B+', allergies: ['Sulfa drugs'], chronicConditions: ['Type 2 Diabetes'] },
];

const doctorProfiles = (userIds) => [
  {
    userId: userIds[3],
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD (Cardiology), DM',
    regNo: 'MCI-2024-001',
    experience: 15,
    bio: 'Senior cardiologist with 15 years of experience in interventional cardiology.',
    languages: ['English', 'Hindi'],
    rating: 4.8,
    ratingCount: 240,
    price: 800,
    online: true,
    isVerified: true,
    consultationCount: 1200,
    hospital: { name: 'Apollo Hospital', city: 'Mumbai', state: 'Maharashtra' },
    availability: [
      { day: 'monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'friday', startTime: '09:00', endTime: '13:00', isAvailable: true },
    ],
  },
  {
    userId: userIds[4],
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD (Dermatology)',
    regNo: 'MCI-2024-002',
    experience: 8,
    bio: 'Specialist in skin conditions, cosmetic dermatology, and hair disorders.',
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 4.6,
    ratingCount: 178,
    price: 600,
    online: false,
    isVerified: true,
    consultationCount: 890,
    hospital: { name: 'Fortis Hospital', city: 'Delhi', state: 'Delhi' },
    availability: [
      { day: 'tuesday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      { day: 'thursday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      { day: 'saturday', startTime: '10:00', endTime: '14:00', isAvailable: true },
    ],
  },
  {
    userId: userIds[5],
    specialization: 'General Physician',
    qualification: 'MBBS, MD (Internal Medicine)',
    regNo: 'MCI-2024-003',
    experience: 12,
    bio: 'Experienced general physician specializing in preventive healthcare and chronic disease management.',
    languages: ['English', 'Telugu', 'Kannada'],
    rating: 4.7,
    ratingCount: 312,
    price: 400,
    online: true,
    isVerified: true,
    consultationCount: 2100,
    hospital: { name: 'Manipal Hospital', city: 'Bangalore', state: 'Karnataka' },
    availability: [
      { day: 'monday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'tuesday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'wednesday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'thursday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'friday', startTime: '08:00', endTime: '12:00', isAvailable: true },
    ],
  },
  {
    userId: userIds[6],
    specialization: 'Neurologist',
    qualification: 'MBBS, MD, DM (Neurology)',
    regNo: 'MCI-2024-004',
    experience: 20,
    bio: 'Leading neurologist with expertise in stroke management, epilepsy, and movement disorders.',
    languages: ['English', 'Hindi'],
    rating: 4.9,
    ratingCount: 156,
    price: 1200,
    online: false,
    isVerified: true,
    consultationCount: 750,
    hospital: { name: 'AIIMS', city: 'New Delhi', state: 'Delhi' },
    availability: [
      { day: 'monday', startTime: '14:00', endTime: '18:00', isAvailable: true },
      { day: 'thursday', startTime: '14:00', endTime: '18:00', isAvailable: true },
    ],
  },
  {
    userId: userIds[7],
    specialization: 'Pediatrician',
    qualification: 'MBBS, DCH, MD (Pediatrics)',
    regNo: 'MCI-2024-005',
    experience: 10,
    bio: 'Child health specialist with a warm approach to patient care and expertise in neonatal conditions.',
    languages: ['English', 'Hindi', 'Malayalam'],
    rating: 4.8,
    ratingCount: 203,
    price: 500,
    online: true,
    isVerified: true,
    consultationCount: 1450,
    hospital: { name: 'Amrita Hospital', city: 'Kochi', state: 'Kerala' },
    availability: [
      { day: 'monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'saturday', startTime: '09:00', endTime: '13:00', isAvailable: true },
    ],
  },
];

module.exports = { users, patientProfiles, doctorProfiles };
