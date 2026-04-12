const crypto = require('crypto');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { success, error } = require('../utils/apiResponse');
const { sendEmail, emailTemplates } = require('../utils/email');
const { ROLES } = require('../utils/constants');

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  let user;
  try {
    const { name, email, password, role, phone, specialization, qualification, regNo, price } = req.body;
    const requestedRole = role || ROLES.PATIENT;

    // Check existing
    const existing = await User.findOne({ email });
    if (existing) return error(res, 'Email already registered', 409);

    if (
      requestedRole === ROLES.DOCTOR &&
      (!specialization || !qualification || !regNo || price === undefined || price === null)
    ) {
      return error(res, 'Doctors must provide specialization, qualification, regNo, and price', 400);
    }

    // Create user
    user = await User.create({ name, email, password, role: requestedRole, phone });

    // Create role profile
    if (user.role === ROLES.PATIENT) {
      await Patient.create({ userId: user._id });
    } else if (user.role === ROLES.DOCTOR) {
      await Doctor.create({ userId: user._id, specialization, qualification, regNo, price });
    }

    // Send verification email
    try {
      const rawToken = user.generateEmailVerifyToken();
      await user.save({ validateBeforeSave: false });
      const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${rawToken}`;
      const tmpl = emailTemplates.verifyEmail(user.name, verifyUrl);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (emailErr) {
      console.warn(`Email verification send failed: ${emailErr.message}`);
    }

    const token = user.getSignedToken();
    const refreshToken = user.getRefreshToken();

    return success(res, { token, refreshToken, user: user.toSafeJSON() }, 201);
  } catch (err) {
    if (user?._id) {
      await Promise.allSettled([
        Patient.deleteOne({ userId: user._id }),
        Doctor.deleteOne({ userId: user._id }),
        User.findByIdAndDelete(user._id),
      ]);
    }
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return error(res, 'Invalid credentials', 401);
    if (!user.isActive) return error(res, 'Account is deactivated', 401);

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return error(res, 'Invalid credentials', 401);

    // Update lastSeen
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // Set doctor online
    if (user.role === ROLES.DOCTOR) {
      await Doctor.findOneAndUpdate({ userId: user._id }, { online: true });
    }

    const token = user.getSignedToken();
    const refreshToken = user.getRefreshToken();

    console.log(`User logged in: ${email}`);
    return success(res, { token, refreshToken, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    if (req.user?.role === ROLES.DOCTOR) {
      await Doctor.findOneAndUpdate({ userId: req.user._id }, { online: false });
    }
    return success(res, null, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let profile = null;

    if (req.user.role === ROLES.PATIENT) {
      profile = await Patient.findOne({ userId: req.user._id });
    } else if (req.user.role === ROLES.DOCTOR) {
      profile = await Doctor.findOne({ userId: req.user._id });
    }

    return success(res, { user: user.toSafeJSON(), profile });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400);

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return error(res, 'Invalid refresh token', 401);

    const newToken = user.getSignedToken();
    const newRefreshToken = user.getRefreshToken();
    return success(res, { token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return error(res, 'Invalid or expired refresh token', 401);
    }
    next(err);
  }
};

/**
 * GET /api/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerifyToken: hashed,
      emailVerifyExpire: { $gt: Date.now() },
    });
    if (!user) return error(res, 'Invalid or expired verification link', 400);

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return success(res, { message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return error(res, 'No account found with that email', 404);

    const rawToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
    const tmpl = emailTemplates.passwordReset(user.name, resetUrl);

    try {
      await sendEmail({ to: user.email, ...tmpl });
      return success(res, { message: 'Password reset email sent' });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return error(res, 'Failed to send email. Try again later.', 500);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) return error(res, 'Invalid or expired reset link', 400);

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = user.getSignedToken();
    return success(res, { token, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) return error(res, 'Current password is incorrect', 400);

    user.password = req.body.newPassword;
    await user.save();
    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
