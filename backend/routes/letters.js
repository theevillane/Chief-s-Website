'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/lettersController');
const { protect, requireVerified, authorise } = require('../middlewares/auth');
const {
  createLetterValidator,
  approveLetterValidator,
  rejectLetterValidator,
  mongoIdParam,
  paginationValidator,
} = require('../middlewares/validate');

const ADMIN_ROLES = ['admin','chief','assistant_chief'];

/**
 * @swagger
 * /api/letters:
 *   post:
 *     tags: [Letters]
 *     summary: Submit a letter request
 *     description: Authenticated, verified citizens submit a request for an official letter.
 *   get:
 *     tags: [Letters]
 *     summary: Get letter requests (own for citizens; all for admins)
 */
router
  .route('/')
  .post(protect, requireVerified, createLetterValidator, ctrl.createLetter)
  .get(protect, paginationValidator, ctrl.getLetters);

/**
 * @swagger
 * /api/letters/{id}:
 *   get:
 *     tags: [Letters]
 *     summary: Get a specific letter by ID
 *   delete:
 *     tags: [Letters]
 *     summary: Withdraw (citizen) or delete (admin) a letter request
 */
router
  .route('/:id')
  .get(protect, mongoIdParam('id'), ctrl.getLetterById)
  .delete(protect, mongoIdParam('id'), ctrl.deleteLetter);

/**
 * @swagger
 * /api/letters/{id}/review:
 *   patch:
 *     tags: [Letters]
 *     summary: Admin marks a letter as under review
 */
router.patch('/:id/review',
  protect, authorise(...ADMIN_ROLES), mongoIdParam('id'), ctrl.markUnderReview
);

/**
 * @swagger
 * /api/letters/{id}/approve:
 *   patch:
 *     tags: [Letters]
 *     summary: Admin approves letter and generates PDF
 */
router.patch('/:id/approve',
  protect, authorise(...ADMIN_ROLES), mongoIdParam('id'), approveLetterValidator, ctrl.approveLetter
);

/**
 * @swagger
 * /api/letters/{id}/reject:
 *   patch:
 *     tags: [Letters]
 *     summary: Admin rejects a letter request with reason
 */
router.patch('/:id/reject',
  protect, authorise(...ADMIN_ROLES), mongoIdParam('id'), rejectLetterValidator, ctrl.rejectLetter
);

/**
 * @swagger
 * /api/letters/{id}/download:
 *   get:
 *     tags: [Letters]
 *     summary: Download the approved letter PDF
 */
router.get('/:id/download',
  protect, mongoIdParam('id'), ctrl.downloadLetter
);

module.exports = router;
