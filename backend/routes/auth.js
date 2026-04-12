const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── Validation chains ─────────────────────────────────────────────────────────

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['patient', 'doctor']).withMessage('Role must be patient or doctor'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('specialization').if(body('role').equals('doctor')).notEmpty().withMessage('Specialization required for doctors'),
  body('qualification').if(body('role').equals('doctor')).notEmpty().withMessage('Qualification required for doctors'),
  body('regNo').if(body('role').equals('doctor')).notEmpty().withMessage('Registration number required for doctors'),
  body('price').if(body('role').equals('doctor')).isFloat({ min: 0 }).withMessage('Valid price required for doctors'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
];

const resetRules = [
  param('token').notEmpty(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (patient or doctor)
 *     tags: [Auth]
 */
router.post('/register', registerRules, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT
 *     tags: [Auth]
 */
router.post('/login', loginRules, validate, login);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);

router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotRules, validate, forgotPassword);
router.put('/reset-password/:token', resetRules, validate, resetPassword);
router.put('/change-password', protect, changePasswordRules, validate, changePassword);

module.exports = router;
