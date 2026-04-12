const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  createPrescription,
  getPrescriptionById,
  updateStatus,
  getDoctorPrescriptions,
  cancelPrescription,
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES, PRESCRIPTION_STATUS } = require('../utils/constants');

const createRules = [
  body('patientId').isMongoId().withMessage('Valid patient ID required'),
  body('consultationId').optional().isMongoId().withMessage('Invalid consultation ID'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required'),
  body('medicines').isArray({ min: 1 }).withMessage('At least one medicine required'),
  body('medicines.*.name').notEmpty().withMessage('Medicine name required'),
  body('medicines.*.dosage').notEmpty().withMessage('Medicine dosage required'),
  body('medicines.*.frequency').notEmpty().withMessage('Medicine frequency required'),
  body('medicines.*.duration').notEmpty().withMessage('Medicine duration required'),
];

const updateStatusRules = [
  param('id').isMongoId().withMessage('Invalid prescription ID'),
  body('status').isIn(Object.values(PRESCRIPTION_STATUS)).withMessage('Invalid status'),
];

const idRules = [
  param('id').isMongoId().withMessage('Invalid prescription ID'),
];

// Doctor: list own prescriptions & create
router.get('/', protect, authorize(ROLES.DOCTOR), getDoctorPrescriptions);
router.post('/', protect, authorize(ROLES.DOCTOR), createRules, validate, createPrescription);

// Both roles: get by ID (access controlled in controller)
router.get('/:id', protect, idRules, validate, getPrescriptionById);

// Doctor: update status & cancel
router.put('/:id/status', protect, authorize(ROLES.DOCTOR), updateStatusRules, validate, updateStatus);
router.delete('/:id', protect, authorize(ROLES.DOCTOR), idRules, validate, cancelPrescription);

module.exports = router;
