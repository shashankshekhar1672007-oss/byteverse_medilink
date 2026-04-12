const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deactivateUser,
  restoreUser,
  getDashboard,
} = require('../controllers/adminController');
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  SPECIALIZATIONS,
  BLOOD_GROUPS,
  GENDERS,
} = require('../utils/constants');

const adminOnly = [protect, authorize(ROLES.ADMIN)];
const idRule = param('id').isMongoId().withMessage('Invalid ID');

const userListRules = [
  query('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be at least 1'),
];

const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('patientProfile.age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be 0-150'),
  body('patientProfile.gender').optional().isIn(GENDERS).withMessage('Invalid gender'),
  body('patientProfile.bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('Invalid blood group'),
  body('doctorProfile.specialization').if(body('role').equals(ROLES.DOCTOR)).isIn(SPECIALIZATIONS).withMessage('Valid specialization required'),
  body('doctorProfile.qualification').if(body('role').equals(ROLES.DOCTOR)).trim().notEmpty().withMessage('Qualification required'),
  body('doctorProfile.regNo').if(body('role').equals(ROLES.DOCTOR)).trim().notEmpty().withMessage('Registration number required'),
  body('doctorProfile.price').if(body('role').equals(ROLES.DOCTOR)).isFloat({ min: 0 }).withMessage('Valid price required'),
];

const updateUserRules = [
  idRule,
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
  body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be true or false'),
  body('patientProfile.age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be 0-150'),
  body('patientProfile.gender').optional().isIn(GENDERS).withMessage('Invalid gender'),
  body('patientProfile.bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('Invalid blood group'),
  body('doctorProfile.specialization').optional().isIn(SPECIALIZATIONS).withMessage('Invalid specialization'),
  body('doctorProfile.price').optional().isFloat({ min: 0 }).withMessage('Valid price required'),
  body('doctorProfile.isVerified').optional().isBoolean().withMessage('Doctor verification must be true or false'),
];

const orderListRules = [
  query('status').optional().isIn(Object.values(ORDER_STATUS)).withMessage('Invalid order status'),
  query('patientId').optional().isMongoId().withMessage('Invalid patientId'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be at least 1'),
];

const orderStatusRules = [
  idRule,
  body('status').optional().isIn(Object.values(ORDER_STATUS)).withMessage('Invalid order status'),
  body('paymentStatus').optional().isIn(Object.values(PAYMENT_STATUS)).withMessage('Invalid payment status'),
  body('note').optional().isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters'),
  body().custom((value) => {
    if (!value.status && !value.paymentStatus) {
      throw new Error('status or paymentStatus is required');
    }
    return true;
  }),
];

router.use(...adminOnly);

router.get('/dashboard', getDashboard);

router.get('/users', userListRules, validate, getUsers);
router.post('/users', createUserRules, validate, createUser);
router.get('/users/:id', idRule, validate, getUserById);
router.put('/users/:id', updateUserRules, validate, updateUser);
router.delete('/users/:id', idRule, validate, deactivateUser);
router.put('/users/:id/restore', idRule, validate, restoreUser);

router.get('/orders', orderListRules, validate, getOrders);
router.get('/orders/:id', idRule, validate, getOrderById);
router.put('/orders/:id/status', orderStatusRules, validate, updateOrderStatus);
router.put('/orders/:id/cancel', idRule, body('reason').optional().isLength({ max: 300 }), validate, cancelOrder);

module.exports = router;
