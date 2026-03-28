'use strict';

/**
 * Generate a unique, human-readable reference number.
 *
 * Formats:
 *   Letters:  JE-2025-001
 *   Disputes: JE-D-1023
 *   Security: JE-S-4521
 *   Illicit:  JE-I-7812
 *
 * Uses current year + zero-padded counter via a simple counter approach.
 * In production, combine with a DB sequence or shortid for true uniqueness.
 */

const generateLetterRef = () => {
  const year    = new Date().getFullYear();
  const counter = String(Math.floor(Math.random() * 9000) + 1000); // demo; use DB seq in prod
  return `JE-${year}-${counter}`;
};

const generateDisputeRef = () => {
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `JE-D-${num}`;
};

const generateSecurityRef = () => {
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `JE-S-${num}`;
};

const generateIllicitRef = () => {
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `JE-I-${num}`;
};

/**
 * Generate a 6-digit numeric OTP.
 * @returns {string}
 */
const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

module.exports = {
  generateLetterRef,
  generateDisputeRef,
  generateSecurityRef,
  generateIllicitRef,
  generateOtp,
};
