'use strict';
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  startConsultation,
  getConsultationById,
  acceptConsultation,
  endConsultation,
  cancelConsultation,
  sendMessage,
  getMessages,
} = require('../controllers/consultationController');
const { protect, authorize } = require('../middleware/auth');
const { handleDocumentUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');

const startRules = [
  body('doctorId').notEmpty().withMessage('Doctor ID required'),
  body('reason').optional().isLength({ max: 300 }),
];

const messageRules = [
  body('text').optional().isLength({ max: 2000 }).withMessage('Message too long'),
];

// Patient: start a consultation
router.post('/',           protect, authorize(ROLES.PATIENT), startRules, validate, startConsultation);

// Both: get consultation detail
router.get('/:id',         protect, getConsultationById);

// Doctor: manually accept a pending consultation
router.put('/:id/accept',  protect, authorize(ROLES.DOCTOR), acceptConsultation);

// Both: end an active consultation
router.put('/:id/end',     protect, endConsultation);

// Both: cancel
router.put('/:id/cancel',  protect, cancelConsultation);

// Both: messages
router.post('/:id/messages', protect, handleDocumentUpload, messageRules, validate, sendMessage);
router.get('/:id/messages',  protect, getMessages);

module.exports = router;
