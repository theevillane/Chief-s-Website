'use strict';

const logger = require('../utils/logger');

/**
 * Centralised error handler.
 * Must be registered LAST in the Express middleware chain.
 *
 * Handles:
 *  - Mongoose ValidationError
 *  - Mongoose CastError (bad ObjectId)
 *  - Mongoose duplicate key (E11000)
 *  - JWT errors
 *  - Multer file upload errors
 *  - Generic application errors
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let errors     = null;

  // ── Mongoose Validation Error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = 'Validation failed';
    errors     = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // ── Mongoose Bad ObjectId ─────────────────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // ── Mongoose Duplicate Key ────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    const value = Object.values(err.keyValue || {})[0];
    message = `${field ? `'${field}'` : 'A field'} with value '${value}' already exists.`;

    // Friendlier messages for known unique fields
    if (field === 'id_number') message = 'A citizen with this National ID is already registered.';
    if (field === 'phone')     message = 'This phone number is already registered.';
  }

  // ── JWT Errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid authentication token. Please sign in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Your session has expired. Please sign in again.';
  }

  // ── Multer Errors ─────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    statusCode = 400;
    message    = err.message || 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field in upload.';
    }
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
    message    = err.message;
  }

  // ── CORS Error ────────────────────────────────────────────────────────────
  if (message.startsWith('CORS policy:')) {
    statusCode = 403;
  }

  // ── Log server errors (5xx) ───────────────────────────────────────────────
  if (statusCode >= 500) {
    logger.error({
      message:    err.message,
      stack:      err.stack,
      method:     req.method,
      url:        req.originalUrl,
      ip:         req.ip,
      user:       req.user?._id,
    });
  } else {
    logger.warn({
      message:    err.message,
      statusCode,
      method:     req.method,
      url:        req.originalUrl,
    });
  }

  // ── Never leak stack traces in production ────────────────────────────────
  const response = { success: false, message };
  if (errors)                              response.errors = errors;
  if (process.env.NODE_ENV !== 'production' && err.stack)
                                           response.stack  = err.stack;

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
