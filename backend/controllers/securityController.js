'use strict';

const SecurityReport = require('../models/SecurityReport');
const User           = require('../models/User');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const { generateSecurityRef }             = require('../utils/generateRefNumber');
const { buildFileUrls }                   = require('../middlewares/upload');
const { sendUrgentSecurityAlertSms }      = require('../services/smsService');
const logger                              = require('../utils/logger');

// ─── POST /api/security ───────────────────────────────────────────────────────
exports.createReport = async (req, res, next) => {
  try {
    const { type, urgency, description, village, location_detail, anonymous } = req.body;

    const isAnon    = anonymous === true || anonymous === 'true';
    const reportedBy = isAnon ? null : req.user?._id;

    const evidenceUrls = buildFileUrls(req.files);

    const report = await SecurityReport.create({
      ref_number:      generateSecurityRef(),
      type,
      urgency,
      description,
      village,
      location_detail: location_detail || null,
      reported_by:     reportedBy,
      anonymous:       isAnon,
      evidence_urls:   evidenceUrls,
    });

    // ── Dispatch immediate SMS alert to admin for urgent reports ──────────────
    if (urgency === 'urgent' || urgency === 'high') {
      try {
        const admins = await User.find({
          role:      { $in: ['admin','chief','assistant_chief'] },
          is_active: true,
        }).select('phone');

        const adminPhones = admins.map((a) => a.phone);
        if (adminPhones.length > 0) {
          await sendUrgentSecurityAlertSms(adminPhones, type, village);
          report.alert_sent = true;
          await report.save({ validateBeforeSave: false });
        }
      } catch (alertErr) {
        logger.warn(`Urgent security alert SMS failed: ${alertErr.message}`);
      }
    }

    logger.info(`Security report filed: ${report.ref_number} | urgency: ${urgency} | village: ${village}`);

    const message = urgency === 'urgent'
      ? 'URGENT report received. Security officials have been alerted immediately.'
      : 'Security report submitted. The administration has been notified.';

    return sendSuccess(res, 201, message, { report });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/security ────────────────────────────────────────────────────────
exports.getReports = async (req, res, next) => {
  try {
    const { status, urgency, village, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status)  filter.status  = status;
    if (urgency) filter.urgency = urgency;
    if (village) filter.village = village;

    const total   = await SecurityReport.countDocuments(filter);
    const reports = await SecurityReport
      .find(filter)
      .sort({ urgency: -1, created_at: -1 })  // urgent first
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('assigned_to resolved_by', 'name role');

    return sendSuccess(res, 200, 'Security reports retrieved', reports, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/security/:id ────────────────────────────────────────────────────
exports.getReportById = async (req, res, next) => {
  try {
    const report = await SecurityReport.findById(req.params.id)
      .populate('assigned_to resolved_by', 'name role');

    if (!report) return sendError(res, 404, 'Security report not found.');
    return sendSuccess(res, 200, 'Report retrieved', report);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/security/:id ──────────────────────────────────────────────────
exports.updateReport = async (req, res, next) => {
  try {
    const allowed = ['status','response_notes','assigned_to','escalated_to'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.body.status === 'resolved') {
      updates.resolved_by = req.user._id;
      updates.resolved_at = new Date();
    }

    const report = await SecurityReport.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    if (!report) return sendError(res, 404, 'Report not found.');
    logger.info(`Security report updated: ${report.ref_number} → ${report.status}`);
    return sendSuccess(res, 200, 'Report updated.', report);
  } catch (err) {
    next(err);
  }
};
