// illicit.js
'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/illicitController');
const { protect, authorise, optionalAuth } = require('../middlewares/auth');
const { evidenceUpload }     = require('../middlewares/upload');
const { uploadLimiter }      = require('../middlewares/rateLimiter');
const { createIllicitReportValidator, mongoIdParam, paginationValidator } = require('../middlewares/validate');
const ADMIN = ['admin','chief','assistant_chief'];

router.route('/')
  .post(optionalAuth, uploadLimiter, evidenceUpload.array('evidence', 5), createIllicitReportValidator, ctrl.createReport)
  .get(protect, authorise(...ADMIN), paginationValidator, ctrl.getReports);

router.route('/:id')
  .get(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.getReportById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.updateReport);

module.exports = router;
