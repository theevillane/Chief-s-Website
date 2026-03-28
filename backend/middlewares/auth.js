'use strict';

const { verifyAccessToken } = require('../services/tokenService');
const User                  = require('../models/User');
const { sendError }         = require('../utils/apiResponse');
const logger                = require('../utils/logger');

/**
 * protect — verifies the JWT Bearer token and loads req.user.
 * Must be called before any route that requires authentication.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'No authentication token provided. Please sign in.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Load fresh user from DB (catches deactivated / deleted accounts)
    const user = await User.findById(decoded.sub).select('-password -refresh_token');

    if (!user) {
      return sendError(res, 401, 'The user belonging to this token no longer exists.');
    }

    if (!user.is_active) {
      return sendError(res, 401, 'Your account has been deactivated. Contact the Chief\'s office.');
    }

    req.user = user;
    next();
  } catch (err) {
    // JWT errors are re-thrown and handled by errorHandler
    next(err);
  }
};

/**
 * requireVerified — ensures the user has completed OTP phone verification.
 * Must be used after protect().
 */
const requireVerified = (req, res, next) => {
  if (!req.user.verified) {
    return sendError(res, 403, 'Phone number not verified. Please verify your phone to access this service.');
  }
  next();
};

/**
 * authorise(...roles) — RBAC middleware factory.
 * Usage: router.get('/admin', protect, authorise('admin','chief'), controller)
 *
 * @param  {...string} roles - allowed roles
 * @returns Express middleware
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorised access attempt: user ${req.user._id} (${req.user.role}) → ${req.originalUrl}`);
      return sendError(
        res, 403,
        `Access denied. This route requires one of the following roles: ${roles.join(', ')}.`
      );
    }
    next();
  };
};

/**
 * optionalAuth — like protect() but does NOT fail if no token.
 * Useful for routes that allow both authenticated and anonymous access
 * (e.g. anonymous security / illicit reports).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token   = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user    = await User.findById(decoded.sub).select('-password -refresh_token');
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

// Shorthand combos used in routes
const adminOnly        = [protect, authorise('admin', 'chief', 'assistant_chief')];
const chiefOnly        = [protect, authorise('chief', 'admin')];
const citizenOrAdmin   = [protect];

module.exports = {
  protect,
  requireVerified,
  authorise,
  optionalAuth,
  adminOnly,
  chiefOnly,
  citizenOrAdmin,
};
