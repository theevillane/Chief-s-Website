'use strict';

const router = require('express').Router();
const { protect, authorise } = require('../middlewares/auth');
const { sendSuccess }        = require('../utils/apiResponse');
const logger                 = require('../utils/logger');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Auth]
 *     summary: Get in-app notifications for the authenticated user
 *     description: |
 *       Returns recent notifications for the current user.
 *       In production this reads from a Notification collection.
 *       Currently returns a structured demo payload.
 */
router.get('/', protect, async (req, res, next) => {
  try {
    // ── In production: query Notification model for req.user._id ─────────────
    // const notifications = await Notification.find({ user_id: req.user._id })
    //   .sort({ created_at: -1 }).limit(20);

    // Demo payload that maps to the frontend notification panel
    const notifications = [
      {
        id:         'n001',
        type:       'letter_approved',
        message:    'Your Residence Confirmation letter has been approved. You can now download it.',
        ref_number: 'JE-2025-001',
        read:       false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id:         'n002',
        type:       'announcement',
        message:    'New baraza announcement: Public Meeting scheduled for Friday.',
        read:       false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id:         'n003',
        type:       'hearing_scheduled',
        message:    'Dispute hearing scheduled for 20 March at Jimo East DO Grounds.',
        ref_number: 'JE-D-1023',
        read:       true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return sendSuccess(res, 200, 'Notifications retrieved', notifications, {
      unread: notifications.filter((n) => !n.read).length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Auth]
 *     summary: Mark a notification as read
 */
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    // In production: Notification.findByIdAndUpdate(req.params.id, { read: true })
    return sendSuccess(res, 200, 'Notification marked as read.');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Auth]
 *     summary: Mark all notifications as read
 */
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'All notifications marked as read.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
