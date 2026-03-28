'use strict';

const OTP          = require('../models/OTP');
const { generateOtp } = require('../utils/generateRefNumber');
const { sendOtpSms }  = require('./smsService');
const logger          = require('../utils/logger');

const OTP_TTL_MINUTES = 10;

/**
 * Generate and send a new OTP for the given phone number.
 * Deletes any existing OTPs for the same phone + purpose before creating a new one.
 *
 * @param {string} phone   - Normalised Kenyan phone
 * @param {string} purpose - 'registration' | 'login' | 'password_reset'
 * @returns {Promise<{success: boolean}>}
 */
const generateAndSendOtp = async (phone, purpose = 'registration') => {
  // Delete any previous OTPs for this phone + purpose
  await OTP.deleteMany({ phone, purpose });

  const rawOtp   = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // The model's pre-save hook hashes the otp_hash field
  const otpDoc = new OTP({
    phone,
    otp_hash:   rawOtp,   // will be hashed by model pre-save
    purpose,
    expires_at: expiresAt,
  });
  await otpDoc.save();

  const smsResult = await sendOtpSms(phone, rawOtp);
  logger.info(`OTP generated for ${phone} [${purpose}] — SMS: ${smsResult.success ? 'sent' : 'failed'}`);

  return { success: true, expires_in_minutes: OTP_TTL_MINUTES };
};

/**
 * Verify an OTP code submitted by the user.
 *
 * @param {string} phone
 * @param {string} candidateOtp
 * @param {string} purpose
 * @returns {Promise<{valid: boolean, message: string}>}
 */
const verifyOtp = async (phone, candidateOtp, purpose = 'registration') => {
  const record = await OTP.findOne({
    phone,
    purpose,
    is_used:    false,
    expires_at: { $gt: new Date() },
  });

  if (!record) {
    return { valid: false, message: 'OTP has expired or was not found. Please request a new one.' };
  }

  // Increment attempt counter
  record.attempts += 1;
  await record.save();

  if (record.attempts > 5) {
    await OTP.deleteOne({ _id: record._id });
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  const isValid = await record.verifyOtp(candidateOtp);
  if (!isValid) {
    return { valid: false, message: `Invalid OTP. ${5 - record.attempts} attempt(s) remaining.` };
  }

  // Mark as used
  record.is_used = true;
  await record.save();

  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = { generateAndSendOtp, verifyOtp };
