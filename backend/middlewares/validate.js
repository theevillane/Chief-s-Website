'use strict';

const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

// ─── Validation runner ────────────────────────────────────────────────────────
/**
 * Collect express-validator errors and return 400 if any exist.
 * Always placed as the LAST item in a validation chain array.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'Validation failed', errors.array());
  }
  next();
};

// ─── VALID CONSTANTS ──────────────────────────────────────────────────────────
const VALID_VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];
const VALID_LETTER_TYPES  = ['id_letter','residence','school','conduct','intro_id'];
const VALID_DISPUTE_TYPES = ['Land Boundary','Family Conflict','Inheritance','Neighbor Dispute','Water Rights','Other'];
const VALID_SECURITY_TYPES = ['Theft','Violence','Suspicious Activity','Emergency','Livestock Theft','Other'];
const VALID_ILLICIT_TYPES  = ['Illicit Alcohol Brewing','Drug Abuse','Criminal Activity','Gender-Based Violence','Rape / Defilement','Other'];
const VALID_URGENCY        = ['low','medium','high','urgent'];
const VALID_ROLES          = ['citizen','admin','chief','assistant_chief'];
const VALID_ANN_CATEGORIES = ['baraza','health','government','development','security','general'];

// ─── Auth Validators ──────────────────────────────────────────────────────────
const registerValidator = [
  body('name')
    .trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),

  body('id_number')
    .trim().notEmpty().withMessage('National ID is required')
    .matches(/^\d{7,8}$/).withMessage('National ID must be 7 or 8 digits'),

  body('phone')
    .trim().notEmpty().withMessage('Phone number is required')
    .matches(/^07\d{8}$|^\+2547\d{8}$/).withMessage('Enter a valid Kenyan phone number (07XXXXXXXX)'),

  body('village')
    .trim().notEmpty().withMessage('Village is required')
    .isIn(VALID_VILLAGES).withMessage('Not a valid village in Jimo East Location'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  validate,
];

const loginValidator = [
  body('phone')
    .trim().notEmpty().withMessage('Phone number or ID number is required')
    .custom((val) => {
      const isPhone = /^07\d{8}$|^\+2547\d{8}$/.test(val);
      const isId    = /^\d{7,8}$/.test(val);
      if (isPhone || isId) return true;
      throw new Error('Enter a valid phone (07XXXXXXXX or +2547XXXXXXXX) or National ID (7–8 digits)');
    }),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

const otpVerifyValidator = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('otp')
    .trim().notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  body('purpose')
    .optional()
    .isIn(['registration','login','password_reset']).withMessage('Invalid purpose'),
  validate,
];

const changePasswordValidator = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
];

// ─── Letter Validators ────────────────────────────────────────────────────────
const createLetterValidator = [
  body('letter_type')
    .trim().notEmpty().withMessage('Letter type is required')
    .isIn(VALID_LETTER_TYPES).withMessage('Invalid letter type'),

  body('village')
    .trim().notEmpty().withMessage('Village is required')
    .isIn(VALID_VILLAGES).withMessage('Not a valid village'),

  body('purpose')
    .trim().notEmpty().withMessage('Purpose is required')
    .isLength({ min: 10, max: 500 }).withMessage('Purpose must be between 10 and 500 characters'),

  body('destination')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 }).withMessage('Destination must not exceed 200 characters'),

  validate,
];

const approveLetterValidator = [
  body('admin_notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  validate,
];

const rejectLetterValidator = [
  body('rejection_reason')
    .trim().notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5, max: 300 }).withMessage('Rejection reason must be between 5 and 300 characters'),
  validate,
];

// ─── Dispute Validators ───────────────────────────────────────────────────────
const createDisputeValidator = [
  body('type')
    .trim().notEmpty().withMessage('Dispute type is required')
    .isIn(VALID_DISPUTE_TYPES).withMessage('Invalid dispute type'),

  body('parties')
    .trim().notEmpty().withMessage('Names of parties involved are required')
    .isLength({ min: 3, max: 300 }).withMessage('Parties field must be between 3 and 300 characters'),

  body('description')
    .trim().notEmpty().withMessage('Dispute description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),

  body('village')
    .trim().notEmpty().withMessage('Village is required')
    .isIn(VALID_VILLAGES).withMessage('Not a valid village'),

  body('location_description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 }),

  body('anonymous')
    .optional()
    .isBoolean().withMessage('Anonymous must be true or false'),

  validate,
];

const scheduleHearingValidator = [
  body('hearing_date')
    .notEmpty().withMessage('Hearing date is required')
    .isISO8601().withMessage('Hearing date must be a valid ISO 8601 date')
    .custom((val) => {
      if (new Date(val) <= new Date()) throw new Error('Hearing date must be in the future');
      return true;
    }),
  body('hearing_venue')
    .optional()
    .isLength({ max: 200 }),
  body('hearing_notes')
    .optional()
    .isLength({ max: 500 }),
  validate,
];

const resolveDisputeValidator = [
  body('resolution_notes')
    .trim().notEmpty().withMessage('Resolution notes are required')
    .isLength({ min: 10, max: 2000 }),
  validate,
];

// ─── Security Validators ──────────────────────────────────────────────────────
const createSecurityReportValidator = [
  body('type')
    .trim().notEmpty().withMessage('Incident type is required')
    .isIn(VALID_SECURITY_TYPES).withMessage('Invalid incident type'),

  body('urgency')
    .trim().notEmpty().withMessage('Urgency level is required')
    .isIn(VALID_URGENCY).withMessage('Invalid urgency. Must be low, medium, high, or urgent'),

  body('description')
    .trim().notEmpty().withMessage('Incident description is required')
    .isLength({ min: 15, max: 2000 }),

  body('village')
    .trim().notEmpty().withMessage('Village is required')
    .isIn(VALID_VILLAGES).withMessage('Not a valid village'),

  body('anonymous')
    .optional()
    .isBoolean(),

  validate,
];

// ─── Illicit Validators ───────────────────────────────────────────────────────
const createIllicitReportValidator = [
  body('type')
    .trim().notEmpty().withMessage('Activity type is required')
    .isIn(VALID_ILLICIT_TYPES).withMessage('Invalid activity type'),

  body('description')
    .trim().notEmpty().withMessage('Description is required')
    .isLength({ min: 15, max: 2000 }),

  body('village')
    .trim().notEmpty().withMessage('Village is required')
    .isIn(VALID_VILLAGES).withMessage('Not a valid village'),

  validate,
];

// ─── Announcement Validators ──────────────────────────────────────────────────
const createAnnouncementValidator = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 150 }),

  body('body')
    .trim().notEmpty().withMessage('Announcement body is required')
    .isLength({ min: 10, max: 2000 }),

  body('category')
    .optional()
    .isIn(VALID_ANN_CATEGORIES).withMessage('Invalid category'),

  body('target_villages')
    .optional()
    .isArray().withMessage('target_villages must be an array')
    .custom((arr) => {
      if (!arr || arr.length === 0) return true;
      const valid = [...VALID_VILLAGES, 'all'];
      for (const v of arr) {
        if (!valid.includes(v)) throw new Error(`'${v}' is not a valid village`);
      }
      return true;
    }),

  body('send_sms')
    .optional()
    .isBoolean(),

  body('expiry_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('expiry_date must be a valid date'),

  validate,
];

// ─── Common param validator ───────────────────────────────────────────────────
const mongoIdParam = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`${paramName} must be a valid ID`),
  validate,
];

// ─── Pagination query validator ───────────────────────────────────────────────
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  validate,
];

module.exports = {
  // runners
  validate,
  mongoIdParam,
  paginationValidator,
  // auth
  registerValidator,
  loginValidator,
  otpVerifyValidator,
  changePasswordValidator,
  // letters
  createLetterValidator,
  approveLetterValidator,
  rejectLetterValidator,
  // disputes
  createDisputeValidator,
  scheduleHearingValidator,
  resolveDisputeValidator,
  // security
  createSecurityReportValidator,
  // illicit
  createIllicitReportValidator,
  // announcements
  createAnnouncementValidator,
};
