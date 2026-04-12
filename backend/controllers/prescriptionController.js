const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Consultation = require('../models/Consultation');
const { success, error, paginate } = require('../utils/apiResponse');
const { sendEmail, emailTemplates } = require('../utils/email');
const { PRESCRIPTION_STATUS, PAGINATION } = require('../utils/constants');

/**
 * POST /api/prescriptions
 * Doctor only
 */
exports.createPrescription = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'name');
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const { patientId, consultationId, diagnosis, symptoms, medicines, labTests, advice, followUpDate, notes } = req.body;

    const patient = await Patient.findById(patientId).populate('userId', 'name email');
    if (!patient) return error(res, 'Patient not found', 404);

    // Optionally link to one of this doctor's consultations for this patient.
    if (consultationId) {
      const consultation = await Consultation.findById(consultationId);
      if (!consultation) return error(res, 'Consultation not found', 404);
      if (!consultation.doctor.equals(doctor._id) || !consultation.patient.equals(patient._id)) {
        return error(res, 'Consultation does not match this doctor and patient', 403);
      }
    }

    const prescription = await Prescription.create({
      createdBy: doctor._id,
      createdFor: patient._id,
      consultation: consultationId || undefined,
      diagnosis,
      symptoms: symptoms || [],
      medicines,
      labTests: labTests || [],
      advice,
      followUpDate: followUpDate || undefined,
      notes,
    });

    // Attach prescription to consultation
    if (consultationId) {
      await Consultation.findByIdAndUpdate(consultationId, { prescription: prescription._id });
    }

    // Email patient
    try {
      const tmpl = emailTemplates.prescriptionCreated(patient.userId.name, doctor.userId.name, diagnosis);
      await sendEmail({ to: patient.userId.email, ...tmpl });
    } catch (emailErr) {
      console.warn(`Prescription email failed: ${emailErr.message}`);
    }

    const populated = await prescription.populate([
      { path: 'createdBy', populate: { path: 'userId', select: 'name avatar' } },
      { path: 'createdFor', populate: { path: 'userId', select: 'name email' } },
    ]);

    return success(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/prescriptions/:id
 * Doctor (own) or Patient (own)
 */
exports.getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({ path: 'createdBy', populate: { path: 'userId', select: 'name avatar' } })
      .populate({ path: 'createdFor', populate: { path: 'userId', select: 'name email' } })
      .populate('consultation');

    if (!prescription) return error(res, 'Prescription not found', 404);

    // Access control
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return error(res, 'Doctor profile not found', 404);
      if (!prescription.createdBy._id.equals(doctor._id)) {
        return error(res, 'Not authorized', 403);
      }
    } else if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) return error(res, 'Patient profile not found', 404);
      if (!prescription.createdFor._id.equals(patient._id)) {
        return error(res, 'Not authorized', 403);
      }
    } else {
      return error(res, 'Not authorized', 403);
    }

    return success(res, prescription);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/prescriptions/:id/status
 * Doctor only
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.values(PRESCRIPTION_STATUS).includes(status)) {
      return error(res, `Invalid status. Must be one of: ${Object.values(PRESCRIPTION_STATUS).join(', ')}`, 400);
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, createdBy: doctor._id },
      { status },
      { new: true }
    );

    if (!prescription) return error(res, 'Prescription not found or not authorized', 404);
    return success(res, prescription);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/prescriptions  (doctor's own issued prescriptions)
 */
exports.getDoctorPrescriptions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || PAGINATION.DEFAULT_PAGE, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const filter = { createdBy: doctor._id };
    if (req.query.status) filter.status = req.query.status;

    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate({ path: 'createdFor', populate: { path: 'userId', select: 'name avatar' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(filter),
    ]);

    return paginate(res, prescriptions, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/prescriptions/:id  — cancel (soft)
 * Doctor only, only if active
 */
exports.cancelPrescription = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return error(res, 'Doctor profile not found', 404);

    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, createdBy: doctor._id, status: PRESCRIPTION_STATUS.ACTIVE },
      { status: PRESCRIPTION_STATUS.CANCELLED },
      { new: true }
    );

    if (!prescription) return error(res, 'Prescription not found, not yours, or not active', 404);
    return success(res, prescription);
  } catch (err) {
    next(err);
  }
};
