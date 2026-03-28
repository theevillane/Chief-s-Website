'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/securityController');
const { protect, optionalAuth, authorise } = require('../middlewares/auth');
const { evidenceUpload }   = require('../middlewares/upload');
const { uploadLimiter }    = require('../middlewares/rateLimiter');
const {
  createSecurityReportValidator,
  mongoIdParam,
  paginationValidator,
} = require('../middlewares/validate');

const ADMIN = ['admin','chief','assistant_chief'];

router
  .route('/')
  .post(optionalAuth, uploadLimiter, evidenceUpload.array('evidence', 5), createSecurityReportValidator, ctrl.createReport)
  .get(protect, authorise(...ADMIN), paginationValidator, ctrl.getReports);

router
  .route('/:id')
  .get(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.getReportById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.updateReport);

module.exports = router;
