const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  getPrescriptions,
  getActivePrescriptions,
  getPrescriptionById,
  getConsultations,
  getDashboard,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');
const { handleAvatarUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { ROLES, BLOOD_GROUPS, GENDERS } = require('../utils/constants');

const updateProfileRules = [
  body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be 0–150'),
  body('gender').optional().isIn(GENDERS).withMessage('Invalid gender'),
  body('weight').optional().isFloat({ min: 0 }),
  body('height').optional().isFloat({ min: 0 }),
  body('bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('Invalid blood group'),
];

// All routes require patient auth
router.use(protect, authorize(ROLES.PATIENT));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', handleAvatarUpload, updateProfileRules, validate, updateProfile);

router.get('/prescriptions/active', getActivePrescriptions);
router.get('/prescriptions/:id', getPrescriptionById);
router.get('/prescriptions', getPrescriptions);

router.get('/consultations', getConsultations);

module.exports = router;
