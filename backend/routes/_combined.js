'use strict';

// ══════════════════════════════════════════════════════════
//  disputes.js
// ══════════════════════════════════════════════════════════
const disputeRouter = require('express').Router();
const dCtrl = require('../controllers/disputesController');
const { protect, optionalAuth, authorise } = require('../middlewares/auth');
const { evidenceUpload } = require('../middlewares/upload');
const { uploadLimiter }  = require('../middlewares/rateLimiter');
const {
  createDisputeValidator,
  scheduleHearingValidator,
  resolveDisputeValidator,
  mongoIdParam,
  paginationValidator,
} = require('../middlewares/validate');

const ADMIN = ['admin','chief','assistant_chief'];

disputeRouter
  .route('/')
  .post(
    optionalAuth, uploadLimiter,
    evidenceUpload.array('evidence', 5),
    createDisputeValidator,
    dCtrl.createDispute
  )
  .get(protect, paginationValidator, dCtrl.getDisputes);

disputeRouter.route('/:id')
  .get(protect, mongoIdParam('id'), dCtrl.getDisputeById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), dCtrl.updateDispute);

disputeRouter.patch('/:id/schedule', protect, authorise(...ADMIN), mongoIdParam('id'), scheduleHearingValidator, dCtrl.scheduleHearing);
disputeRouter.patch('/:id/resolve',  protect, authorise(...ADMIN), mongoIdParam('id'), resolveDisputeValidator,  dCtrl.resolveDispute);

module.exports.disputeRouter = disputeRouter;

// ══════════════════════════════════════════════════════════
//  security.js
// ══════════════════════════════════════════════════════════
const securityRouter = require('express').Router();
const sCtrl = require('../controllers/securityController');
const { createSecurityReportValidator } = require('../middlewares/validate');

securityRouter
  .route('/')
  .post(
    optionalAuth, uploadLimiter,
    evidenceUpload.array('evidence', 5),
    createSecurityReportValidator,
    sCtrl.createReport
  )
  .get(protect, authorise(...ADMIN), paginationValidator, sCtrl.getReports);

securityRouter.route('/:id')
  .get(protect, authorise(...ADMIN), mongoIdParam('id'), sCtrl.getReportById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), sCtrl.updateReport);

module.exports.securityRouter = securityRouter;

// ══════════════════════════════════════════════════════════
//  illicit.js
// ══════════════════════════════════════════════════════════
const illicitRouter = require('express').Router();
const iCtrl = require('../controllers/illicitController');
const { createIllicitReportValidator } = require('../middlewares/validate');

// POST is fully public (anonymous)
illicitRouter
  .route('/')
  .post(
    uploadLimiter,
    evidenceUpload.array('evidence', 5),
    createIllicitReportValidator,
    iCtrl.createReport
  )
  .get(protect, authorise(...ADMIN), paginationValidator, iCtrl.getReports);

illicitRouter.route('/:id')
  .get(protect, authorise(...ADMIN), mongoIdParam('id'), iCtrl.getReportById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), iCtrl.updateReport);

module.exports.illicitRouter = illicitRouter;

// ══════════════════════════════════════════════════════════
//  announcements.js
// ══════════════════════════════════════════════════════════
const annRouter = require('express').Router();
const aCtrl = require('../controllers/announcementsController');
const { createAnnouncementValidator } = require('../middlewares/validate');

annRouter
  .route('/')
  .get(paginationValidator, aCtrl.getAnnouncements)          // public
  .post(protect, authorise(...ADMIN), createAnnouncementValidator, aCtrl.createAnnouncement);

annRouter.route('/:id')
  .get(mongoIdParam('id'), aCtrl.getAnnouncementById)        // public
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), aCtrl.updateAnnouncement)
  .delete(protect, authorise(...ADMIN), mongoIdParam('id'), aCtrl.deleteAnnouncement);

module.exports.annRouter = annRouter;

// ══════════════════════════════════════════════════════════
//  admin.js
// ══════════════════════════════════════════════════════════
const adminRouter = require('express').Router();
const adminCtrl   = require('../controllers/adminController');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

adminRouter.use(protect, authorise(...ADMIN)); // All admin routes protected

adminRouter.get('/stats',                            adminCtrl.getDashboardStats);
adminRouter.get('/villages',                         adminCtrl.getVillageStats);
adminRouter.get('/citizens',          paginationValidator, adminCtrl.getCitizens);
adminRouter.patch('/citizens/:id/deactivate', mongoIdParam('id'), adminCtrl.deactivateCitizen);
adminRouter.patch('/citizens/:id/role', [
  mongoIdParam('id'),
  body('role').notEmpty().withMessage('Role is required'),
  validate,
], adminCtrl.updateCitizenRole);
adminRouter.get('/reports/export',                   adminCtrl.exportData);

module.exports.adminRouter = adminRouter;

// ══════════════════════════════════════════════════════════
//  notifications.js
// ══════════════════════════════════════════════════════════
const notifRouter = require('express').Router();
const User        = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/notifications — placeholder for in-app notifications
// In production this would connect to a Notification model
notifRouter.get('/', protect, async (req, res) => {
  // Static demo notifications until a Notification model is added
  const notifications = [
    {
      id:      'n1',
      type:    'letter_approved',
      message: 'Your ID letter request has been approved.',
      read:    false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id:      'n2',
      type:    'announcement',
      message: 'New baraza announcement published.',
      read:    true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];
  sendSuccess(res, 200, 'Notifications', notifications);
});

module.exports.notifRouter = notifRouter;
