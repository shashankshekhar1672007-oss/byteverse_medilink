const mongoose = require('mongoose');
const { SPECIALIZATIONS } = require('../utils/constants');

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "17:00"
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      enum: SPECIALIZATIONS,
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
    },
    regNo: {
      type: String,
      required: [true, 'Medical registration number is required'],
      unique: true,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    languages: [{ type: String }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Consultation price is required'],
      min: 0,
    },
    online: {
      type: Boolean,
      default: false,
    },
    availability: [availabilitySlotSchema],
    consultationCount: {
      type: Number,
      default: 0,
    },
    hospital: {
      name: String,
      city: String,
      state: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: populate user info
doctorSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Indexes
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ online: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ price: 1 });

// Update rating on review
doctorSchema.methods.updateRating = async function (newRating) {
  const totalRating = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = Math.round((totalRating / this.ratingCount) * 10) / 10;
  await this.save();
};

module.exports = mongoose.model('Doctor', doctorSchema);
