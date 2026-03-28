'use strict';

const rateLimit = require('express-rate-limit');
const logger    = require('../utils/logger');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const makeHandler = (label) => (req, res, next, options) => {
  logger.warn(`Rate limit [${label}] hit: IP ${req.ip} → ${req.originalUrl}`);
  res.status(429).json({ success: false, message: options.message });
};

/** Strict limiter for auth endpoints (login, register, OTP) */
const authLimiter = rateLimit({
  windowMs:        WINDOW_MS,
  max:             parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         'Too many authentication attempts. Please wait 15 minutes before trying again.',
  handler:         makeHandler('AUTH'),
});

/** Moderate limiter for OTP resend */
const otpLimiter = rateLimit({
  windowMs:        5 * 60 * 1000, // 5 minutes
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         'Too many OTP requests. Please wait 5 minutes.',
  handler:         makeHandler('OTP'),
});

/** Limiter for file upload routes */
const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         'Too many file uploads in the past hour. Please try again later.',
  handler:         makeHandler('UPLOAD'),
});

module.exports = { authLimiter, otpLimiter, uploadLimiter };
