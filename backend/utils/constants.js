module.exports = {
  ROLES: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
  },

  CONSULTATION_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  PRESCRIPTION_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  PAYMENT_METHODS: ['cod', 'card', 'upi', 'insurance'],

  SPECIALIZATIONS: [
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Neurologist',
    'Orthopedic',
    'Pediatrician',
    'Psychiatrist',
    'Gynecologist',
    'Urologist',
    'Oncologist',
    'Endocrinologist',
    'Gastroenterologist',
    'Pulmonologist',
    'Ophthalmologist',
    'ENT Specialist',
  ],

  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],

  GENDERS: ['male', 'female', 'other'],

  SOCKET_EVENTS: {
    JOIN_CONSULTATION: 'joinConsultation',
    SEND_MESSAGE: 'sendMessage',
    RECEIVE_MESSAGE: 'receiveMessage',
    TYPING: 'typing',
    STOP_TYPING: 'stopTyping',
    DOCTOR_ONLINE: 'doctorOnline',
    DOCTOR_OFFLINE: 'doctorOffline',
    CONSULTATION_ENDED: 'consultationEnded',
    ERROR: 'error',
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
  },

  BCRYPT_ROUNDS: 12,
  EMAIL_VERIFY_EXPIRY_HOURS: 24,
};
