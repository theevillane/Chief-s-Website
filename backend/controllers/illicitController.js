'use strict';

const IllicitReport = require('../models/IllicitReport');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const { generateIllicitRef }              = require('../utils/generateRefNumber');
const { buildFileUrls }                   = require('../middlewares/upload');
const logger                              = require('../utils/logger');

// ─── POST /api/illicit ────────────────────────────────────────────────────────
// No auth required — always anonymous
exports.createReport = async (req, res, next) => {
  try {
    const { type, description, village, location_detail } = req.body;

    const evidenceUrls = buildFileUrls(req.files);

    const report = await IllicitReport.create({
      ref_number:      generateIllicitRef(),
      type,
      description,
      village,
      location_detail: location_detail || null,
      evidence_urls:   evidenceUrls,
    });

    logger.info(`Illicit report received: ${report.ref_number} | type: ${type} | village: ${village}`);

    const message = report.requires_social_services
      ? 'Confidential report received. This has been flagged for social services attention.'
      : 'Confidential report received. The administration will take appropriate action.';

    return sendSuccess(res, 201, message, {
      ref_number: report.ref_number,  // Give reporter a ref for follow-up only
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/illicit — ADMIN ONLY ───────────────────────────────────────────
exports.getReports = async (req, res, next) => {
  try {
    const { status, type, village, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status)  filter.status  = status;
    if (type)    filter.type    = type;
    if (village) filter.village = village;

    const total   = await IllicitReport.countDocuments(filter);
    // Include confidential_notes for admin
    const reports = await IllicitReport
      .find(filter)
      .select('+confidential_notes')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('reviewed_by', 'name role');

    return sendSuccess(res, 200, 'Illicit reports retrieved', reports, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/illicit/:id — ADMIN ONLY ───────────────────────────────────────
exports.getReportById = async (req, res, next) => {
  try {
    const report = await IllicitReport.findById(req.params.id)
      .select('+confidential_notes')
      .populate('reviewed_by', 'name role');

    if (!report) return sendError(res, 404, 'Report not found.');
    return sendSuccess(res, 200, 'Report retrieved', report);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/illicit/:id — ADMIN ONLY ─────────────────────────────────────
exports.updateReport = async (req, res, next) => {
  try {
    const allowed = ['status','confidential_notes','social_services_notified'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.reviewed_by = req.user._id;
    updates.reviewed_at = new Date();

    const report = await IllicitReport.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    }).select('+confidential_notes');

    if (!report) return sendError(res, 404, 'Report not found.');
    logger.info(`Illicit report updated: ${report.ref_number} → ${report.status}`);
    return sendSuccess(res, 200, 'Report updated.', report);
  } catch (err) {
    next(err);
  }
};
