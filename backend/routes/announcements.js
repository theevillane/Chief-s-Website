'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/announcementsController');
const { protect, authorise } = require('../middlewares/auth');
const {
  createAnnouncementValidator,
  mongoIdParam,
  paginationValidator,
} = require('../middlewares/validate');

const ADMIN = ['admin', 'chief', 'assistant_chief'];

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: Get all active announcements (public)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [baraza,health,government,development,security,general] }
 *       - in: query
 *         name: village
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: "List of announcements" }
 *   post:
 *     tags: [Announcements]
 *     summary: Publish a new announcement (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body]
 *             properties:
 *               title:           { type: string }
 *               body:            { type: string }
 *               category:        { type: string, enum: [baraza,health,government,development,security,general] }
 *               target_villages: { type: array, items: { type: string } }
 *               send_sms:        { type: boolean }
 *               is_pinned:       { type: boolean }
 *               expiry_date:     { type: string, format: date-time }
 */
router
  .route('/')
  .get(paginationValidator, ctrl.getAnnouncements)
  .post(protect, authorise(...ADMIN), createAnnouncementValidator, ctrl.createAnnouncement);

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get a single announcement by ID (public)
 *     security: []
 *   patch:
 *     tags: [Announcements]
 *     summary: Update an announcement (admin only)
 *   delete:
 *     tags: [Announcements]
 *     summary: Soft-delete (deactivate) an announcement (admin only)
 */
router
  .route('/:id')
  .get(mongoIdParam('id'), ctrl.getAnnouncementById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.updateAnnouncement)
  .delete(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.deleteAnnouncement);

module.exports = router;
