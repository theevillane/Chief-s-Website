'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/disputesController');
const { protect, optionalAuth, authorise } = require('../middlewares/auth');
const { evidenceUpload }   = require('../middlewares/upload');
const { uploadLimiter }    = require('../middlewares/rateLimiter');
const {
  createDisputeValidator,
  scheduleHearingValidator,
  resolveDisputeValidator,
  mongoIdParam,
  paginationValidator,
} = require('../middlewares/validate');

const ADMIN = ['admin','chief','assistant_chief'];

router
  .route('/')
  .post(optionalAuth, uploadLimiter, evidenceUpload.array('evidence', 5), createDisputeValidator, ctrl.createDispute)
  .get(protect, paginationValidator, ctrl.getDisputes);

router
  .route('/:id')
  .get(protect, mongoIdParam('id'), ctrl.getDisputeById)
  .patch(protect, authorise(...ADMIN), mongoIdParam('id'), ctrl.updateDispute);

router.patch('/:id/schedule', protect, authorise(...ADMIN), mongoIdParam('id'), scheduleHearingValidator, ctrl.scheduleHearing);
router.patch('/:id/resolve',  protect, authorise(...ADMIN), mongoIdParam('id'), resolveDisputeValidator,  ctrl.resolveDispute);

module.exports = router;
