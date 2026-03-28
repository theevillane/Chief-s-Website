'use strict';

const Dispute  = require('../models/Dispute');
const User     = require('../models/User');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const { generateDisputeRef }              = require('../utils/generateRefNumber');
const { buildFileUrls }                   = require('../middlewares/upload');
const { sendHearingScheduledSms }         = require('../services/smsService');
const logger                              = require('../utils/logger');

// ─── POST /api/disputes ───────────────────────────────────────────────────────
exports.createDispute = async (req, res, next) => {
  try {
    const { type, parties, description, village, location_description, anonymous } = req.body;

    const isAnon     = anonymous === true || anonymous === 'true';
    if (!isAnon && !req.user) {
      return sendError(res, 401, 'Please sign in to submit a dispute with your name, or enable anonymous submission.');
    }
    const citizenUid = isAnon ? null : req.user?._id;
    const citizenName = isAnon ? null : req.user?.name;

    const evidenceUrls = buildFileUrls(req.files);

    const dispute = await Dispute.create({
      ref_number:           generateDisputeRef(),
      type,
      parties,
      description,
      village,
      location_description: location_description || null,
      complainant_uid:      citizenUid,
      complainant_name:     citizenName,
      anonymous:            isAnon,
      evidence_urls:        evidenceUrls,
    });

    logger.info(`Dispute filed: ${dispute.ref_number} | village: ${village} | type: ${type}`);

    return sendSuccess(res, 201,
      'Dispute submitted. The Chief\'s office will contact the parties and schedule a hearing within 5–7 working days.',
      { dispute }
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/disputes ────────────────────────────────────────────────────────
exports.getDisputes = async (req, res, next) => {
  try {
    const { status, type, village, page = 1, limit = 20 } = req.query;
    const isAdmin = ['admin','chief','assistant_chief'].includes(req.user.role);

    const filter = {};
    if (!isAdmin) {
      // Citizens only see their own non-anonymous disputes
      filter.complainant_uid = req.user._id;
    }
    if (status)  filter.status  = status;
    if (type)    filter.type    = type;
    if (village && isAdmin) filter.village = village;

    const total    = await Dispute.countDocuments(filter);
    const disputes = await Dispute
      .find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('assigned_to resolved_by', 'name role');

    return sendSuccess(res, 200, 'Disputes retrieved', disputes, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/disputes/:id ────────────────────────────────────────────────────
exports.getDisputeById = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('assigned_to resolved_by', 'name role');

    if (!dispute) return sendError(res, 404, 'Dispute not found.');

    const isAdmin = ['admin','chief','assistant_chief'].includes(req.user.role);
    const isOwner = dispute.complainant_uid?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return sendError(res, 403, 'Not authorised to view this dispute.');
    }

    return sendSuccess(res, 200, 'Dispute retrieved', dispute);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/disputes/:id/schedule ────────────────────────────────────────
exports.scheduleHearing = async (req, res, next) => {
  try {
    const { hearing_date, hearing_venue, hearing_notes } = req.body;

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return sendError(res, 404, 'Dispute not found.');

    dispute.hearing_date  = new Date(hearing_date);
    dispute.hearing_venue = hearing_venue || 'Jimo East DO Grounds';
    dispute.hearing_notes = hearing_notes || null;
    dispute.status        = 'hearing_scheduled';
    await dispute.save();

    // Notify complainant if not anonymous
    if (!dispute.anonymous && dispute.complainant_uid) {
      try {
        const citizen = await User.findById(dispute.complainant_uid).select('phone');
        if (citizen) {
          const dateStr = new Date(hearing_date).toLocaleDateString('en-KE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          });
          await sendHearingScheduledSms(citizen.phone, dispute.ref_number, dateStr, dispute.hearing_venue);
          dispute.hearing_sms_sent = true;
          await dispute.save({ validateBeforeSave: false });
        }
      } catch (smsErr) {
        logger.warn(`Hearing SMS failed for ${dispute.ref_number}: ${smsErr.message}`);
      }
    }

    logger.info(`Hearing scheduled: ${dispute.ref_number} on ${hearing_date}`);
    return sendSuccess(res, 200, 'Hearing scheduled. Complainant notified via SMS.', dispute);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/disputes/:id/resolve ─────────────────────────────────────────
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution_notes } = req.body;

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return sendError(res, 404, 'Dispute not found.');
    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return sendError(res, 400, 'Dispute is already resolved or closed.');
    }

    dispute.status           = 'resolved';
    dispute.resolution_notes = resolution_notes;
    dispute.resolved_by      = req.user._id;
    dispute.resolved_at      = new Date();
    await dispute.save();

    logger.info(`Dispute resolved: ${dispute.ref_number} by ${req.user._id}`);
    return sendSuccess(res, 200, 'Dispute resolved successfully.', dispute);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/disputes/:id ──────────────────────────────────────────────────
// Generic admin update (add notes, change status, assign officer)
exports.updateDispute = async (req, res, next) => {
  try {
    const allowed = ['status','admin_notes','assigned_to'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const dispute = await Dispute.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    if (!dispute) return sendError(res, 404, 'Dispute not found.');
    return sendSuccess(res, 200, 'Dispute updated.', dispute);
  } catch (err) {
    next(err);
  }
};
