'use strict';

const router    = require('express').Router();
const ctrl      = require('../controllers/adminController');
const { protect, authorise } = require('../middlewares/auth');
const { mongoIdParam, paginationValidator } = require('../middlewares/validate');
const { body }  = require('express-validator');
const { validate } = require('../middlewares/validate');

const ADMIN = ['admin', 'chief', 'assistant_chief'];
const CHIEF = ['admin', 'chief'];

// All admin routes require authentication + admin role
router.use(protect, authorise(...ADMIN));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard KPIs — citizens, letters, disputes, security, trend
 *     responses:
 *       200: { description: "Full dashboard statistics object" }
 */
router.get('/stats', ctrl.getDashboardStats);

/**
 * @swagger
 * /api/admin/villages:
 *   get:
 *     tags: [Admin]
 *     summary: Get per-village activity breakdown for all 20 villages
 */
router.get('/villages', ctrl.getVillageStats);

/**
 * @swagger
 * /api/admin/citizens:
 *   get:
 *     tags: [Admin]
 *     summary: List all registered citizens with optional filters
 *     parameters:
 *       - in: query
 *         name: village
 *         schema: { type: string }
 *       - in: query
 *         name: verified
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, ID number, or phone
 */
router.get('/citizens', paginationValidator, ctrl.getCitizens);

/**
 * @swagger
 * /api/admin/citizens/{id}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate a citizen account
 */
router.patch(
  '/citizens/:id/deactivate',
  authorise(...CHIEF),
  mongoIdParam('id'),
  ctrl.deactivateCitizen
);

/**
 * @swagger
 * /api/admin/citizens/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user's role (chief/admin only)
 */
router.patch(
  '/citizens/:id/role',
  authorise(...CHIEF),
  [
    mongoIdParam('id'),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isIn(['citizen', 'admin', 'chief', 'assistant_chief']).withMessage('Invalid role'),
    validate,
  ],
  ctrl.updateCitizenRole
);

/**
 * @swagger
 * /api/admin/reports/export:
 *   get:
 *     tags: [Admin]
 *     summary: Export records as JSON (letters | disputes | security)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [letters, disputes, security] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 */
router.get('/reports/export', ctrl.exportData);

module.exports = router;
