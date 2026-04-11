const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['patient', 'doctor'],
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentType: {
      type: String,
      enum: ['image', 'document', null],
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validate: must have text or attachment
messageSchema.pre('save', function (next) {
  if (!this.text && !this.attachmentUrl) {
    return next(new Error('Message must have text or an attachment'));
  }
  next();
});

messageSchema.index({ consultation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
