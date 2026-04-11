'use strict';
const mongoose = require('mongoose');
const { CONSULTATION_STATUS } = require('../utils/constants');

const reviewSchema = new mongoose.Schema(
  {
    rating:    { type: Number, min: 1, max: 5, required: true },
    comment:   { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CONSULTATION_STATUS),
      default: CONSULTATION_STATUS.PENDING,
      index: true,
    },
    reason:    { type: String, trim: true, maxlength: [300, 'Reason cannot exceed 300 characters'] },
    startedAt: { type: Date },
    endedAt:   { type: Date },
    duration:  { type: Number },   // minutes
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
    },
    review: reviewSchema,
    roomId: {
      type: String,
      unique: true,
      sparse: true,    // avoid duplicate-key error before pre-save sets it
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate roomId before insert
consultationSchema.pre('save', function (next) {
  if (!this.roomId) {
    const ts   = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    this.roomId = `room-${ts}-${rand}`;
  }
  next();
});

// Instance method: end consultation
consultationSchema.methods.endConsultation = async function () {
  this.endedAt = new Date();
  this.status  = CONSULTATION_STATUS.COMPLETED;
  if (this.startedAt) {
    this.duration = Math.round((this.endedAt - this.startedAt) / 60000);
  }
  await this.save();
};

// Compound indexes only (single-field indexes declared above via index:true)
consultationSchema.index({ patient: 1, status: 1 });
consultationSchema.index({ doctor:  1, status: 1 });

module.exports = mongoose.model('Consultation', consultationSchema);
