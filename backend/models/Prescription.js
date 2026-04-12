const mongoose = require('mongoose');
const { PRESCRIPTION_STATUS } = require('../utils/constants');
const { randomUUID } = require('crypto'); // ✅ FIXED

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    rxId: {
      type: String,
      unique: true, // ✅ creates index automatically
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
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
    symptoms: [{ type: String }],
    medicines: {
      type: [medicineSchema],
      validate: [(arr) => arr.length > 0, 'At least one medicine is required'],
    },
    labTests: [{ type: String }],
    advice: { type: String },
    followUpDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(PRESCRIPTION_STATUS),
      default: PRESCRIPTION_STATUS.ACTIVE,
    },
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔥 Auto-generate rxId
prescriptionSchema.pre('save', function (next) {
  if (!this.rxId) {
    this.rxId = `RX-${randomUUID().slice(0, 8).toUpperCase()}`; // ✅ better unique ID
  }

  // Auto-expire
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = PRESCRIPTION_STATUS.EXPIRED;
  }

  next();
});

// ✅ Indexes (optimized, no duplicate)
prescriptionSchema.index({ createdFor: 1, status: 1 });
prescriptionSchema.index({ createdBy: 1 });

// ❌ REMOVED duplicate: prescriptionSchema.index({ rxId: 1 });

// 🔥 Virtual: isExpired
prescriptionSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);