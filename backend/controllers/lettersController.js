'use strict';

const ServiceRequest = require('../models/ServiceRequest');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const { generateLetterRef }  = require('../utils/generateRefNumber');
const { generateLetterPDF }  = require('../services/pdfService');
const {
  sendLetterApprovedSms,
  sendLetterRejectedSms,
} = require('../services/smsService');
const User   = require('../models/User');
const logger = require('../utils/logger');

// ─── POST /api/letters ────────────────────────────────────────────────────────
exports.createLetter = async (req, res, next) => {
  try {
    const { letter_type, village, purpose, destination, urgency } = req.body;
    const citizen = req.user;

    const ref = generateLetterRef();

    const request = await ServiceRequest.create({
      ref_number:       ref,
      letter_type,
      citizen_uid:      citizen._id,
      citizen_name:     citizen.name,
      citizen_id_number: citizen.id_number,
      village:          village || citizen.village,
      purpose,
      destination:      destination || null,
      urgency:          urgency || 'normal',
      status:           'submitted',
    });

    logger.info(`Letter request created: ${ref} by ${citizen._id} (${letter_type})`);

    return sendSuccess(res, 201, 'Letter request submitted successfully. You will be notified via SMS once it is reviewed.', {
      request,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/letters ─────────────────────────────────────────────────────────
// Citizens see their own requests; admins see all (filterable)
exports.getLetters = async (req, res, next) => {
  try {
    const { status, letter_type, village, page = 1, limit = 20 } = req.query;
    const isAdmin = ['admin','chief','assistant_chief'].includes(req.user.role);

    const filter = {};
    if (!isAdmin) filter.citizen_uid = req.user._id;  // citizen: own only
    if (status)      filter.status      = status;
    if (letter_type) filter.letter_type = letter_type;
    if (village && isAdmin) filter.village = village;

    const total   = await ServiceRequest.countDocuments(filter);
    const letters = await ServiceRequest
      .find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('citizen_uid', 'name phone village')
      .populate('approved_by', 'name role');

    return sendSuccess(res, 200, 'Letters retrieved', letters, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/letters/:id ──────────────────────────────────────────────────────
exports.getLetterById = async (req, res, next) => {
  try {
    const letter = await ServiceRequest
      .findById(req.params.id)
      .populate('citizen_uid', 'name phone village id_number')
      .populate('approved_by reviewed_by', 'name role');

    if (!letter) return sendError(res, 404, 'Letter request not found.');

    // Citizens may only view their own
    const isAdmin = ['admin','chief','assistant_chief'].includes(req.user.role);
    const ownerId = letter.citizen_uid
      ? (letter.citizen_uid._id || letter.citizen_uid).toString()
      : null;
    if (!isAdmin && ownerId !== req.user._id.toString()) {
      return sendError(res, 403, 'You are not authorised to view this letter.');
    }

    return sendSuccess(res, 200, 'Letter retrieved', letter);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/letters/:id/review ────────────────────────────────────────────
exports.markUnderReview = async (req, res, next) => {
  try {
    const letter = await ServiceRequest.findById(req.params.id);
    if (!letter) return sendError(res, 404, 'Letter request not found.');
    if (letter.status !== 'submitted') {
      return sendError(res, 400, `Cannot mark as under review — current status is '${letter.status}'.`);
    }

    letter.status      = 'under_review';
    letter.reviewed_by = req.user._id;
    letter.reviewed_at = new Date();
    await letter.save();

    return sendSuccess(res, 200, 'Letter marked as under review.', letter);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/letters/:id/approve ──────────────────────────────────────────
exports.approveLetter = async (req, res, next) => {
  try {
    const { admin_notes } = req.body;
    const letter = await ServiceRequest
      .findById(req.params.id)
      .populate('citizen_uid', 'name phone village id_number');

    if (!letter) return sendError(res, 404, 'Letter request not found.');
    if (!['submitted','under_review'].includes(letter.status)) {
      return sendError(res, 400, `Cannot approve — current status is '${letter.status}'.`);
    }

    // Generate the official PDF
    let pdfResult;
    try {
      pdfResult = await generateLetterPDF(letter);
    } catch (pdfErr) {
      logger.error(`PDF generation failed for ${letter.ref_number}: ${pdfErr.message}`);
      return sendError(res, 500, 'Letter approval succeeded but PDF generation failed. Please try again.');
    }

    letter.status         = 'approved';
    letter.approved_by    = req.user._id;
    letter.approved_at    = new Date();
    letter.admin_notes    = admin_notes || null;
    letter.letter_pdf_url  = pdfResult.fileUrl;
    letter.letter_pdf_path = pdfResult.filePath;
    await letter.save();

    // Notify citizen via SMS
    try {
      const citizenId = letter.citizen_uid?._id || letter.citizen_uid;
      const citizen = await User.findById(citizenId).select('phone name');
      if (citizen) {
        const smsResult = await sendLetterApprovedSms(citizen.phone, letter.ref_number, letter.type_label);
        if (smsResult.success) {
          letter.sms_sent_approval = true;
          await letter.save({ validateBeforeSave: false });
        }
      }
    } catch (smsErr) {
      logger.warn(`SMS notification failed for ${letter.ref_number}: ${smsErr.message}`);
    }

    logger.info(`Letter approved: ${letter.ref_number} by ${req.user._id}`);

    return sendSuccess(res, 200, 'Letter approved and PDF generated. Citizen notified via SMS.', {
      letter,
      pdf_url: pdfResult.fileUrl,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/letters/:id/reject ───────────────────────────────────────────
exports.rejectLetter = async (req, res, next) => {
  try {
    const { rejection_reason } = req.body;
    const letter = await ServiceRequest.findById(req.params.id);

    if (!letter) return sendError(res, 404, 'Letter request not found.');
    if (!['submitted','under_review'].includes(letter.status)) {
      return sendError(res, 400, `Cannot reject — current status is '${letter.status}'.`);
    }

    letter.status           = 'rejected';
    letter.rejection_reason = rejection_reason;
    letter.reviewed_by      = req.user._id;
    letter.reviewed_at      = new Date();
    await letter.save();

    // Notify citizen
    try {
      const citizen = await User.findById(letter.citizen_uid).select('phone');
      if (citizen) {
        await sendLetterRejectedSms(citizen.phone, letter.ref_number, rejection_reason);
        letter.sms_sent_rejection = true;
        await letter.save({ validateBeforeSave: false });
      }
    } catch (smsErr) {
      logger.warn(`Rejection SMS failed for ${letter.ref_number}: ${smsErr.message}`);
    }

    logger.info(`Letter rejected: ${letter.ref_number} — reason: ${rejection_reason}`);

    return sendSuccess(res, 200, 'Letter request rejected. Citizen notified via SMS.', letter);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/letters/:id/download ───────────────────────────────────────────
exports.downloadLetter = async (req, res, next) => {
  try {
    const letter = await ServiceRequest.findById(req.params.id).select('+letter_pdf_path');
    if (!letter) return sendError(res, 404, 'Letter not found.');
    if (letter.status !== 'approved') return sendError(res, 400, 'This letter has not been approved yet.');

    // Citizens can only download their own
    const isAdmin = ['admin','chief','assistant_chief'].includes(req.user.role);
    if (!isAdmin && letter.citizen_uid.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorised.');
    }

    if (!letter.letter_pdf_path) return sendError(res, 404, 'PDF file not found. Please contact the admin.');

    const path = require('path');
    const fs   = require('fs');
    const filePath = letter.letter_pdf_path;

    if (!fs.existsSync(filePath)) {
      return sendError(res, 404, 'PDF file is missing from storage. Please contact the admin to regenerate.');
    }

    const fileName = `${letter.ref_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/letters/:id ──────────────────────────────────────────────────
// Citizens can withdraw a pending request; admins can delete any
exports.deleteLetter = async (req, res, next) => {
  try {
    const letter  = await ServiceRequest.findById(req.params.id);
    if (!letter) return sendError(res, 404, 'Letter not found.');

    const isAdmin = ['admin','chief'].includes(req.user.role);
    const isOwner = letter.citizen_uid.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) return sendError(res, 403, 'Not authorised.');
    if (!isAdmin && letter.status !== 'submitted') {
      return sendError(res, 400, 'You can only withdraw a request that is still in submitted status.');
    }

    // Clean up PDF if exists
    if (letter.letter_pdf_path) {
      const { deletePDF } = require('../services/pdfService');
      deletePDF(letter.letter_pdf_path);
    }

    await letter.deleteOne();

    return sendSuccess(res, 200, 'Letter request deleted.');
  } catch (err) {
    next(err);
  }
};
