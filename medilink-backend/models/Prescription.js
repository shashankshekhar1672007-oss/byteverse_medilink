'use strict';
const mongoose = require('mongoose');
const { PRESCRIPTION_STATUS } = require('../utils/constants');

const medicineSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    dosage:       { type: String, required: true },
    frequency:    { type: String, required: true },
    duration:     { type: String, required: true },
    instructions: { type: String },
    quantity:     { type: Number, default: 1 },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    rxId: {
      type: String,
      unique: true,
      sparse: true,   // allow null during pre-save before it is set
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    createdFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    symptoms:  [{ type: String }],
    medicines: {
      type: [medicineSchema],
      validate: [(arr) => arr && arr.length > 0, 'At least one medicine is required'],
    },
    labTests: [{ type: String }],
    advice:   { type: String },
    followUpDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(PRESCRIPTION_STATUS),
      default: PRESCRIPTION_STATUS.ACTIVE,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes (no duplicate single-field indexes)
prescriptionSchema.index({ createdFor: 1, status: 1 });

// Auto-generate rxId before insert
prescriptionSchema.pre('save', function (next) {
  if (!this.rxId) {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.rxId  = `RX-${ts}-${rand}`;
  }
  // Auto-expire if past expiry date
  if (this.expiresAt && this.expiresAt < new Date() && this.status === PRESCRIPTION_STATUS.ACTIVE) {
    this.status = PRESCRIPTION_STATUS.EXPIRED;
  }
  next();
});

// Virtual: isExpired
prescriptionSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
