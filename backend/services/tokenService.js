'use strict';

const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN         || '1h';
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  logger.error('JWT secrets are not configured. Set JWT_SECRET and JWT_REFRESH_SECRET in .env');
  // Do not exit — allow server to start so the error is visible
}

/**
 * Sign an access token for a user.
 * Payload carries only what the frontend needs (no sensitive fields).
 */
const signAccessToken = (user) => {
  const payload = {
    sub:     user._id.toString(),
    role:    user.role,
    name:    user.name,
    village: user.village,
    verified: user.verified,
  };
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer:    'jimo-east-portal',
    audience:  'jimo-east-citizens',
  });
};

/**
 * Sign a refresh token.
 * Contains only the user ID — minimal payload.
 */
const signRefreshToken = (userId) => {
  return jwt.sign({ sub: userId.toString() }, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer:    'jimo-east-portal',
    audience:  'jimo-east-citizens',
  });
};

/**
 * Verify an access token.
 * @returns {object} decoded payload
 * @throws  {JsonWebTokenError | TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer:   'jimo-east-portal',
    audience: 'jimo-east-citizens',
  });
};

/**
 * Verify a refresh token.
 * @returns {object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer:   'jimo-east-portal',
    audience: 'jimo-east-citizens',
  });
};

/**
 * Decode a token WITHOUT verifying signature (for logging / inspection only).
 */
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
