'use strict';

const User              = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../services/tokenService');
const { generateAndSendOtp, verifyOtp } = require('../services/otpService');
const { sendRegistrationWelcomeSms }    = require('../services/smsService');
const { normalisePhone }                = require('../services/smsService');
const logger                            = require('../utils/logger');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, id_number, phone, village, password, email } = req.body;

    // Check duplicates before hashing
    const existing = await User.findOne({
      $or: [{ id_number }, { phone: normalisePhone(phone) }],
    });
    if (existing) {
      const field = existing.id_number === id_number ? 'National ID' : 'phone number';
      return sendError(res, 409, `A citizen with this ${field} is already registered.`);
    }

    const user = await User.create({
      name, id_number, phone, village, password,
      email: email || null,
    });

    // Send OTP for phone verification
    await generateAndSendOtp(user.phone, 'registration');

    logger.info(`New citizen registered: ${user._id} (${user.village})`);

    return sendSuccess(res, 201, 'Registration successful. A 6-digit OTP has been sent to your phone.', {
      user_id: user._id,
      phone:   user.display_phone,
      name:    user.name,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, purpose = 'registration' } = req.body;

    const normPhone = normalisePhone(phone);
    const result    = await verifyOtp(normPhone, otp, purpose);

    if (!result.valid) {
      return sendError(res, 400, result.message);
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
      { phone: normPhone },
      { verified: true, verified_at: new Date() },
      { new: true }
    );

    if (!user) return sendError(res, 404, 'User not found.');

    // Send welcome SMS on successful registration verification
    if (purpose === 'registration') {
      await sendRegistrationWelcomeSms(user.phone, user.name.split(' ')[0]);
    }

    // Issue tokens
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user._id);

    user.refresh_token = refreshToken;
    user.last_login    = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User verified & logged in: ${user._id}`);

    return sendSuccess(res, 200, 'Phone verified successfully. Welcome!', {
      access_token:  accessToken,
      refresh_token: refreshToken,
      user:          user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
exports.resendOtp = async (req, res, next) => {
  try {
    const { phone, purpose = 'registration' } = req.body;
    const normPhone = normalisePhone(phone);

    const user = await User.findOne({ phone: normPhone });
    if (!user) return sendError(res, 404, 'No account found with this phone number.');

    if (purpose === 'registration' && user.verified) {
      return sendError(res, 400, 'This phone number is already verified.');
    }

    await generateAndSendOtp(normPhone, purpose);

    return sendSuccess(res, 200, 'A new OTP has been sent to your phone.');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Accept login by phone OR national ID number
    const isPhone = /^07\d{8}$|^\+2547\d{8}$/.test(phone);
    const query   = isPhone
      ? { phone: normalisePhone(phone) }
      : { id_number: phone };

    const user = await User.findOne(query).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Incorrect phone/ID or password.');
    }

    if (!user.is_active) {
      return sendError(res, 401, 'Your account has been deactivated. Contact the Chief\'s office.');
    }

    // If not verified, re-send OTP and prompt
    if (!user.verified) {
      await generateAndSendOtp(user.phone, 'registration');
      return sendError(res, 403, 'Phone not verified. A new OTP has been sent. Please verify your phone to continue.', [{
        field: 'otp_required',
        phone: user.display_phone,
      }]);
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user._id);

    user.refresh_token = refreshToken;
    user.last_login    = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user._id} (${user.role})`);

    return sendSuccess(res, 200, 'Login successful.', {
      access_token:  accessToken,
      refresh_token: refreshToken,
      user:          user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return sendError(res, 400, 'Refresh token is required.');

    let decoded;
    try {
      decoded = verifyRefreshToken(refresh_token);
    } catch {
      return sendError(res, 401, 'Invalid or expired refresh token. Please sign in again.');
    }

    const user = await User.findById(decoded.sub).select('+refresh_token');
    if (!user || !user.is_active) {
      return sendError(res, 401, 'User not found or account deactivated.');
    }

    const newAccessToken  = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user._id);

    user.refresh_token = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 200, 'Token refreshed.', {
      access_token:  newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refresh_token: null });
    }
    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, 'User profile', user.toPublicJSON());
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/auth/change-password ─────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(current_password))) {
      return sendError(res, 401, 'Current password is incorrect.');
    }

    user.password = new_password;
    await user.save();

    logger.info(`Password changed: ${user._id}`);
    return sendSuccess(res, 200, 'Password updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const normPhone = normalisePhone(phone);
    const user      = await User.findOne({ phone: normPhone });

    // Always respond generically to prevent user enumeration
    if (!user) {
      return sendSuccess(res, 200, 'If an account exists for this phone, a reset OTP has been sent.');
    }

    await generateAndSendOtp(normPhone, 'password_reset');
    return sendSuccess(res, 200, 'A password reset OTP has been sent to your phone.');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { phone, otp, new_password } = req.body;
    const normPhone = normalisePhone(phone);

    const result = await verifyOtp(normPhone, otp, 'password_reset');
    if (!result.valid) return sendError(res, 400, result.message);

    const user = await User.findOne({ phone: normPhone });
    if (!user) return sendError(res, 404, 'User not found.');

    user.password = new_password;
    await user.save();

    logger.info(`Password reset: ${user._id}`);
    return sendSuccess(res, 200, 'Password reset successfully. Please sign in.');
  } catch (err) {
    next(err);
  }
};
