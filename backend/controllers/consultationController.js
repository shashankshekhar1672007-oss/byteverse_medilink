const Consultation = require('../models/Consultation');
const Message = require('../models/Message');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { success, error, paginate } = require('../utils/apiResponse');
const { sendEmail, emailTemplates } = require('../utils/email');
const { CONSULTATION_STATUS, PAGINATION, SOCKET_EVENTS } = require('../utils/constants');

// Lazy-import socket helpers to avoid circular dep
const getIO = () => {
  try { return require('../socket/ioInstance'); } catch { return null; }
};

/**
 * POST /api/consultations
 * Patient starts a consultation
 */
exports.startConsultation = async (req, res, next) => {
  try {
    const { doctorId, reason } = req.body;

    const patient = await Patient.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!patient) return error(res, 'Patient profile not found', 404);

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name email');
    if (!doctor) return error(res, 'Doctor not found', 404);

    // Check for existing active consultation between them
    const existing = await Consultation.findOne({
      patient: patient._id,
      doctor: doctor._id,
      status: { $in: [CONSULTATION_STATUS.PENDING, CONSULTATION_STATUS.ACTIVE] },
    });
    if (existing) {
      const populatedExisting = await existing.populate([
        { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
        { path: 'doctor', populate: { path: 'userId', select: 'name avatar' } },
      ]);

      notifyDoctorConsultationRequest({
        consultation: populatedExisting,
        doctor,
        patient,
        reason: existing.reason || reason,
        reused: true,
      });

      return success(res, populatedExisting, 200, { reused: true });
    }

    // ✅ GENERATE UNIQUE ROOM ID
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const roomId = `room-${patient._id.toString().slice(-6)}-${timestamp}-${randomStr}`;

    const consultation = await Consultation.create({
      patient: patient._id,
      doctor: doctor._id,
      reason,
      status: CONSULTATION_STATUS.PENDING,
      roomId,  // ✅ Unique roomId for WebRTC
    });

    console.log(`New consultation created: ${consultation._id}, room: ${roomId}`);

    // Notify doctor via email
    try {
      const tmpl = emailTemplates.consultationStarted(doctor.userId.name, patient.userId.name);
      await sendEmail({ to: doctor.userId.email, ...tmpl });
    } catch (emailErr) {
      console.warn(`Consultation email failed: ${emailErr.message}`);
    }

    const populated = await consultation.populate([
      { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'doctor', populate: { path: 'userId', select: 'name avatar' } },
    ]);

    notifyDoctorConsultationRequest({
      consultation: populated,
      doctor,
      patient,
      reason,
    });

    return success(res, populated, 201);
  } catch (err) {
    console.error(`startConsultation error: ${err.message}`);
    
    // Handle duplicate key errors specifically
    if (err.code === 11000) {
      return error(res, 'Consultation creation conflict - please try again', 409);
    }
    
    next(err);
  }
};

function notifyDoctorConsultationRequest({ consultation, doctor, patient, reason, reused = false }) {
  try {
    const { emitToUser } = require('../socket/handlers');
    const io = require('../socket/ioInstance').get();
    if (!io || !doctor?.userId?._id) return;

    emitToUser(io, doctor.userId._id, 'consultationRequest', {
      consultationId: consultation._id,
      roomId: consultation.roomId,
      status: consultation.status,
      reused,
      patient: {
        name: patient.userId?.name || 'A patient',
        id: patient._id,
      },
      reason: reason || 'General consultation',
      createdAt: consultation.createdAt,
    });

    console.log(`Socket consultation notification sent to doctor ${doctor.userId.name}`);
  } catch (socketErr) {
    console.warn(`Socket notification failed: ${socketErr.message}`);
  }
}

/**
 * PUT /api/consultations/:id/leave
 * Lightweight call-leave signal. Authenticated participants notify the room;
 * unauthenticated unload/beacon calls are accepted as no-ops to avoid noisy 401s.
 */
exports.leaveConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    if (!req.user) {
      return success(res, { message: 'Call leave acknowledged' }, 202);
    }

    await _assertAccess(req.user, consultation);

    try {
      const ioModule = getIO();
      const io = ioModule?.get ? ioModule.get() : ioModule;
      const roomId = consultation.roomId || consultation._id.toString();

      if (io && roomId) {
        io.to(roomId).emit('webrtc:peer-left', {
          consultationId: consultation._id,
          roomId,
          userId: req.user._id,
          role: req.user.role,
          name: req.user.name,
          leftAt: new Date(),
        });
      }
    } catch (socketErr) {
        console.warn(`End consultation socket notification failed: ${socketErr.message}`);
    }

    return success(res, { message: 'Call leave acknowledged' }, 202);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/consultations/:id
 * Patient or Doctor (own)
 */
exports.getConsultationById = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'userId', select: 'name avatar email' } })
      .populate({ path: 'doctor', populate: { path: 'userId', select: 'name avatar email' } })
      .populate('prescription');

    if (!consultation) return error(res, 'Consultation not found', 404);

    // Access control
    await _assertAccess(req.user, consultation);

    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/consultations/:id/accept
 * Doctor accepts a pending consultation
 */
exports.acceptConsultation = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const consultation = await Consultation.findOneAndUpdate(
      { _id: req.params.id, doctor: doctor._id, status: CONSULTATION_STATUS.PENDING },
      { status: CONSULTATION_STATUS.ACTIVE, startedAt: new Date() },
      { new: true }
    ).populate([
      { path: 'patient', populate: { path: 'userId', select: 'name avatar email' } },
      { path: 'doctor', populate: { path: 'userId', select: 'name avatar' } },
    ]);

    if (!consultation) return error(res, 'Consultation not found or not pending', 404);

    // Increment doctor's consultation count
    await Doctor.findByIdAndUpdate(doctor._id, { $inc: { consultationCount: 1 } });

    // 🔔 Notify patient that doctor accepted
    try {
      const { emitToUser } = require('../socket/handlers');
      const io = require('../socket/ioInstance').get();
      const patientUserId = consultation.patient?.userId?._id || consultation.patient?.userId;
      if (io && patientUserId) {
        emitToUser(io, patientUserId, 'consultationAccepted', {
          consultationId: consultation._id,
          doctorName: consultation.doctor?.userId?.name || 'Your doctor',
        });
      }
    } catch (socketErr) {
      console.warn(`Accept notification failed: ${socketErr.message}`);
    }

    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/consultations/:id/end
 * Doctor ends an active consultation
 */
exports.endConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    await _assertAccess(req.user, consultation);

    if (consultation.status === CONSULTATION_STATUS.CANCELLED) {
      return error(res, 'Cancelled consultations cannot be ended', 400);
    }

    if (
      consultation.status !== CONSULTATION_STATUS.ACTIVE &&
      consultation.status !== CONSULTATION_STATUS.COMPLETED
    ) {
      return error(res, 'Only active consultations can be ended', 400);
    }

    const wasActive = consultation.status === CONSULTATION_STATUS.ACTIVE;
    if (wasActive) {
      await consultation.endConsultation();
    }

    if (req.user.role === 'doctor' && req.body.notes) {
      consultation.notes = req.body.notes;
      await consultation.save();
    }

    const populated = await consultation.populate([
      { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'doctor', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'prescription' },
    ]);

    if (wasActive) {
      try {
        const ioModule = getIO();
        const io = ioModule?.get ? ioModule.get() : ioModule;
        const roomId = consultation.roomId || consultation._id.toString();

        if (io && roomId) {
          const payload = {
            consultationId: consultation._id,
            roomId,
            endedBy: {
              userId: req.user._id,
              role: req.user.role,
              name: req.user.name,
            },
            endedAt: consultation.endedAt,
          };

          io.to(roomId).emit(SOCKET_EVENTS.CONSULTATION_ENDED, payload);
          io.to(roomId).emit('webrtc:call-ended', payload);
        }
      } catch (socketErr) {
        console.warn(`End consultation socket notification failed: ${socketErr.message}`);
      }
    }

    return success(res, populated);
  } catch (err) {
    next(err);
  }
};

/**
 * get /api/consultations/pending
 * get Doctors all pending consultation
 */

/**
 * GET /api/consultations/pending
 * Get doctor's pending consultations
 */
exports.getPendingConsultations = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const consultations = await Consultation.find({
      doctor: doctor._id,  // ← Use doctor._id (matches schema)
      status: CONSULTATION_STATUS.PENDING,  // ← Use constant
    })
    .populate({
      path: 'patient', 
      populate: { 
        path: 'userId', 
        select: 'name email avatar'  // ← More patient info
      }
    })
    .sort({ createdAt: -1 });  // ← Newest first

    return success(res, consultations);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/consultations/:id/cancel
 * Patient or Doctor can cancel a pending consultation
 */
exports.cancelConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    await _assertAccess(req.user, consultation);

    if (consultation.status !== CONSULTATION_STATUS.PENDING) {
      return error(res, 'Only pending consultations can be cancelled', 400);
    }

    consultation.status = CONSULTATION_STATUS.CANCELLED;
    await consultation.save();

    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/consultations/:id/messages
 * Send a message in a consultation
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    if (consultation.status !== CONSULTATION_STATUS.ACTIVE) {
      return error(res, 'Consultation is not active', 400);
    }

    await _assertAccess(req.user, consultation);

    const message = await Message.create({
      consultation: consultation._id,
      sender: req.user._id,
      senderRole: req.user.role,
      text: req.body.text,
      attachmentUrl: req.file?.path || undefined,
      attachmentType: req.file ? (req.file.mimetype.startsWith('image') ? 'image' : 'document') : undefined,
    });

    const populated = await message.populate('sender', 'name avatar');
    return success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/consultations/:id/messages
 */
exports.getMessages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    await _assertAccess(req.user, consultation);

    const [messages, total] = await Promise.all([
      Message.find({ consultation: consultation._id })
        .populate('sender', 'name avatar')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ consultation: consultation._id }),
    ]);

    // Mark unread messages as read
    await Message.updateMany(
      { consultation: consultation._id, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return paginate(res, messages, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _assertAccess(user, consultation) {
  if (user.role === 'patient') {
    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) throw Object.assign(new Error('Patient profile not found'), { statusCode: 404 });
    if (!consultation.patient.equals(patient._id)) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  } else if (user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) throw Object.assign(new Error('Doctor profile not found'), { statusCode: 404 });
    if (!consultation.doctor.equals(doctor._id)) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  } else {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }
}
