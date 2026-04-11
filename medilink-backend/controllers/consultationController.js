'use strict';
const Consultation = require('../models/Consultation');
const Message      = require('../models/Message');
const Patient      = require('../models/Patient');
const Doctor       = require('../models/Doctor');
const { success, error, paginate } = require('../utils/apiResponse');
const { sendEmail, emailTemplates }= require('../utils/email');
const { CONSULTATION_STATUS, PAGINATION } = require('../utils/constants');
const logger = require('../utils/logger');

/* ── POST /api/consultations  (Patient starts) ─────────────────────────────── */
exports.startConsultation = async (req, res, next) => {
  try {
    const { doctorId, reason } = req.body;

    const patient = await Patient.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!patient) return error(res, 'Patient profile not found', 404);

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name email');
    if (!doctor) return error(res, 'Doctor not found', 404);

    // Prevent duplicate active consultations
    const existing = await Consultation.findOne({
      patient: patient._id,
      doctor:  doctor._id,
      status:  { $in: [CONSULTATION_STATUS.PENDING, CONSULTATION_STATUS.ACTIVE] },
    });
    if (existing) {
      // Return the existing one so the frontend can navigate to it
      const populated = await existing.populate([
        { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
        { path: 'doctor',  populate: { path: 'userId', select: 'name avatar' } },
      ]);
      return success(res, populated, 200);
    }

    // Create and immediately activate so chat works without a separate accept step
    const consultation = await Consultation.create({
      patient:   patient._id,
      doctor:    doctor._id,
      reason,
      status:    CONSULTATION_STATUS.ACTIVE,   // <-- auto-activate
      startedAt: new Date(),
    });

    // Increment doctor consultation count
    await Doctor.findByIdAndUpdate(doctor._id, { $inc: { consultationCount: 1 } });

    // Email doctor (non-blocking)
    try {
      const tmpl = emailTemplates.consultationStarted(doctor.userId.name, patient.userId.name);
      await sendEmail({ to: doctor.userId.email, ...tmpl });
    } catch (emailErr) {
      logger.warn(`Consultation email failed: ${emailErr.message}`);
    }

    const populated = await consultation.populate([
      { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'doctor',  populate: { path: 'userId', select: 'name avatar' } },
    ]);

    return success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

/* ── GET /api/consultations/:id ────────────────────────────────────────────── */
exports.getConsultationById = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'userId', select: 'name avatar email' } })
      .populate({ path: 'doctor',  populate: { path: 'userId', select: 'name avatar email' } })
      .populate('prescription');

    if (!consultation) return error(res, 'Consultation not found', 404);
    await _assertAccess(req.user, consultation);
    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/* ── PUT /api/consultations/:id/accept  (Doctor manual accept — optional) ──── */
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
      { path: 'doctor',  populate: { path: 'userId', select: 'name avatar' } },
    ]);

    if (!consultation) return error(res, 'Consultation not found or not pending', 404);
    await Doctor.findByIdAndUpdate(doctor._id, { $inc: { consultationCount: 1 } });
    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/* ── PUT /api/consultations/:id/end  (Doctor or Patient can end) ───────────── */
exports.endConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    await _assertAccess(req.user, consultation);

    if (consultation.status !== CONSULTATION_STATUS.ACTIVE) {
      return error(res, 'Consultation is not active', 400);
    }

    await consultation.endConsultation();
    if (req.body.notes) {
      consultation.notes = req.body.notes;
      await consultation.save();
    }

    const populated = await consultation.populate([
      { path: 'patient', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'doctor',  populate: { path: 'userId', select: 'name avatar' } },
      { path: 'prescription' },
    ]);

    return success(res, populated);
  } catch (err) {
    next(err);
  }
};

/* ── PUT /api/consultations/:id/cancel ─────────────────────────────────────── */
exports.cancelConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    await _assertAccess(req.user, consultation);

    if (![CONSULTATION_STATUS.PENDING, CONSULTATION_STATUS.ACTIVE].includes(consultation.status)) {
      return error(res, 'Only pending or active consultations can be cancelled', 400);
    }

    consultation.status = CONSULTATION_STATUS.CANCELLED;
    consultation.endedAt = new Date();
    await consultation.save();

    return success(res, consultation);
  } catch (err) {
    next(err);
  }
};

/* ── POST /api/consultations/:id/messages ──────────────────────────────────── */
exports.sendMessage = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return error(res, 'Consultation not found', 404);

    if (consultation.status !== CONSULTATION_STATUS.ACTIVE) {
      return error(res, 'Consultation is not active', 400);
    }

    await _assertAccess(req.user, consultation);

    if (!req.body.text && !req.file) {
      return error(res, 'Message must have text or attachment', 400);
    }

    const message = await Message.create({
      consultation:   consultation._id,
      sender:         req.user._id,
      senderRole:     req.user.role,
      text:           req.body.text || undefined,
      attachmentUrl:  req.file?.path || undefined,
      attachmentType: req.file
        ? (req.file.mimetype.startsWith('image') ? 'image' : 'document')
        : undefined,
    });

    const populated = await message.populate('sender', 'name avatar');
    return success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

/* ── GET /api/consultations/:id/messages ───────────────────────────────────── */
exports.getMessages = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip  = (page - 1) * limit;

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

    // Mark messages from the other party as read
    await Message.updateMany(
      { consultation: consultation._id, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return paginate(res, messages, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ── Internal: access check ────────────────────────────────────────────────── */
async function _assertAccess(user, consultation) {
  if (user.role === 'patient') {
    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) throw Object.assign(new Error('Patient profile not found'), { statusCode: 404 });
    if (!consultation.patient.equals(patient._id))
      throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  } else if (user.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) throw Object.assign(new Error('Doctor profile not found'), { statusCode: 404 });
    if (!consultation.doctor.equals(doctor._id))
      throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }
}
