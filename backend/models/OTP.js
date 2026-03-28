'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type:     String,
      required: true,
      index:    true,
    },
    // Stored hashed — raw OTP is only sent via SMS
    otp_hash: {
      type:     String,
      required: true,
    },
    purpose: {
      type:    String,
      enum:    ['registration', 'login', 'password_reset'],
      default: 'registration',
    },
    attempts: {
      type:    Number,
      default: 0,
      max:     [5, 'Maximum OTP attempts exceeded'],
    },
    is_used: {
      type:    Boolean,
      default: false,
    },
    expires_at: {
      type:     Date,
      required: true,
      // TTL index: MongoDB auto-deletes expired OTPs
      index:    { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: 'created_at' },
    versionKey: false,
  }
);

// ─── Hash OTP before save ─────────────────────────────────────────────────────
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp_hash')) return next();
  this.otp_hash = await bcrypt.hash(this.otp_hash, 10);
  next();
});

// ─── Verify OTP ───────────────────────────────────────────────────────────────
otpSchema.methods.verifyOtp = async function (candidateOtp) {
  return bcrypt.compare(String(candidateOtp), this.otp_hash);
};

module.exports = mongoose.model('OTP', otpSchema);
