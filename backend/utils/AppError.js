'use strict';

/**
 * AppError — operational errors that can be safely sent to the client.
 *
 * Usage:
 *   throw new AppError('Letter not found', 404);
 *   throw new AppError('Not authorised', 403);
 *
 * Caught by the centralized errorHandler middleware which checks
 * err.isOperational to decide whether to expose the message.
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable message sent to the client
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = true;           // flags it as safe to expose
    this.status        = statusCode >= 500 ? 'error' : 'fail';

    // Maintain proper prototype chain
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
