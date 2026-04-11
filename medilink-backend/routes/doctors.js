const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  getAllDoctors,
  getDoctorById,
  getDoctorsBySpecialty,
  getOwnProfile,
  updateProfile,
  updateOnlineStatus,
  getConsultations,
  getDashboard,
  addReview,
} = require('../controllers/doctorController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { handleAvatarUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { ROLES, SPECIALIZATIONS } = require('../utils/constants');

const updateProfileRules = [
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
];

const reviewRules = [
  param('id').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('consultationId').notEmpty().withMessage('Consultation ID required'),
];

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', optionalAuth, getAllDoctors);
router.get('/specialty/:specialty', getDoctorsBySpecialty);

// ── Doctor-only routes ────────────────────────────────────────────────────────
router.get('/profile', protect, authorize(ROLES.DOCTOR), getOwnProfile);
router.put('/profile', protect, authorize(ROLES.DOCTOR), handleAvatarUpload, updateProfileRules, validate, updateProfile);
router.put('/status', protect, authorize(ROLES.DOCTOR), updateOnlineStatus);
router.get('/consultations', protect, authorize(ROLES.DOCTOR), getConsultations);
router.get('/dashboard', protect, authorize(ROLES.DOCTOR), getDashboard);

// ── Public — must come after /profile /status etc. ───────────────────────────
router.get('/:id', getDoctorById);

// ── Patient posts a review ────────────────────────────────────────────────────
router.post('/:id/review', protect, authorize(ROLES.PATIENT), reviewRules, validate, addReview);

module.exports = router;
