'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const { protect }  = require('../middlewares/auth');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const {
  registerValidator,
  loginValidator,
  otpVerifyValidator,
  changePasswordValidator,
} = require('../middlewares/validate');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new citizen
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, id_number, phone, village, password]
 *             properties:
 *               name:      { type: string, example: "Mary Achieng" }
 *               id_number: { type: string, example: "12345678" }
 *               phone:     { type: string, example: "0712345678" }
 *               village:   { type: string, example: "Kowala" }
 *               password:  { type: string, example: "SecurePass123" }
 *               email:     { type: string, example: "mary@email.com" }
 *     responses:
 *       201: { description: "Registration successful, OTP sent" }
 *       400: { description: "Validation error" }
 *       409: { description: "Duplicate ID or phone" }
 */
router.post('/register', authLimiter, registerValidator, ctrl.register);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and complete registration / login
 *     security: []
 */
router.post('/verify-otp', authLimiter, otpVerifyValidator, ctrl.verifyOtp);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to phone
 *     security: []
 */
router.post('/resend-otp', otpLimiter, [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('purpose').optional().isIn(['registration','login','password_reset']),
  validate,
], ctrl.resendOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with phone/ID and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:    { type: string, example: "0712345678" }
 *               password: { type: string, example: "SecurePass123" }
 *     responses:
 *       200: { description: "Login successful, returns tokens" }
 *       401: { description: "Invalid credentials" }
 *       403: { description: "Phone not verified" }
 */
router.post('/login', authLimiter, loginValidator, ctrl.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     security: []
 */
router.post('/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token is required'),
  validate,
], ctrl.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 */
router.post('/logout', protect, ctrl.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 */
router.get('/me', protect, ctrl.getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password for authenticated user
 */
router.patch('/change-password', protect, changePasswordValidator, ctrl.changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset OTP
 *     security: []
 */
router.post('/forgot-password', otpLimiter, [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  validate,
], ctrl.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP
 *     security: []
 */
router.post('/reset-password', authLimiter, [
  body('phone').trim().notEmpty(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('new_password').isLength({ min: 8 }),
  validate,
], ctrl.resetPassword);

module.exports = router;
