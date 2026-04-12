const mongoose = require('mongoose');
const { BLOOD_GROUPS, GENDERS } = require('../utils/constants');

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age cannot exceed 150'],
    },
    gender: {
      type: String,
      enum: GENDERS,
    },
    weight: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    chronicConditions: [
      {
        type: String,
        trim: true,
      },
    ],
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
    medicalHistory: [
      {
        condition: String,
        treatedBy: String,
        year: Number,
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: populate user info
patientSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: BMI
patientSchema.virtual('bmi').get(function () {
  if (this.weight && this.height && this.height > 0) {
    const heightM = this.height / 100;
    return Math.round((this.weight / (heightM * heightM)) * 10) / 10;
  }
  return null;
});

module.exports = mongoose.model('Patient', patientSchema);
