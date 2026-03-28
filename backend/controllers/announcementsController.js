'use strict';

const Announcement = require('../models/Announcement');
const User         = require('../models/User');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const { sendSMS }  = require('../services/smsService');
const logger       = require('../utils/logger');

// ─── GET /api/announcements ───────────────────────────────────────────────────
// Public — no auth required
exports.getAnnouncements = async (req, res, next) => {
  try {
    const { category, village, page = 1, limit = 20 } = req.query;

    const filter = { is_active: true };
    // Exclude expired
    filter.$or = [
      { expiry_date: null },
      { expiry_date: { $gt: new Date() } },
    ];
    if (category) filter.category = category;
    if (village) {
      filter.target_villages = { $in: ['all', village] };
    }

    const total = await Announcement.countDocuments(filter);
    const announcements = await Announcement
      .find(filter)
      .sort({ is_pinned: -1, created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-published_by');  // Hide admin user ID from public endpoint

    // Increment view count (fire-and-forget)
    Announcement.updateMany(
      { _id: { $in: announcements.map((a) => a._id) } },
      { $inc: { view_count: 1 } }
    ).exec().catch(() => {});

    return sendSuccess(res, 200, 'Announcements retrieved', announcements, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/announcements/:id ───────────────────────────────────────────────
exports.getAnnouncementById = async (req, res, next) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann || !ann.is_active) return sendError(res, 404, 'Announcement not found.');

    ann.view_count += 1;
    await ann.save({ validateBeforeSave: false });

    return sendSuccess(res, 200, 'Announcement retrieved', ann);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/announcements — ADMIN ONLY ────────────────────────────────────
exports.createAnnouncement = async (req, res, next) => {
  try {
    const {
      title, body, category, target_villages,
      send_sms, expiry_date, is_pinned,
    } = req.body;

    const ann = await Announcement.create({
      title,
      body,
      category:         category || 'general',
      target_villages:  target_villages || ['all'],
      published_by:     req.user._id,
      published_by_name: req.user.name,
      send_sms:         !!send_sms,
      is_pinned:        !!is_pinned,
      expiry_date:      expiry_date || null,
    });

    // ── Optional SMS broadcast ─────────────────────────────────────────────────
    if (send_sms) {
      broadcastSMS(ann, req.user).catch((err) =>
        logger.warn(`SMS broadcast failed for announcement ${ann._id}: ${err.message}`)
      );
    }

    logger.info(`Announcement published: "${title}" by ${req.user._id}`);
    return sendSuccess(res, 201, 'Announcement published successfully.', ann);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/announcements/:id — ADMIN ONLY ───────────────────────────────
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const allowed = ['title','body','category','target_villages','is_active','is_pinned','expiry_date'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const ann = await Announcement.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    if (!ann) return sendError(res, 404, 'Announcement not found.');
    return sendSuccess(res, 200, 'Announcement updated.', ann);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/announcements/:id — ADMIN ONLY ──────────────────────────────
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    // Soft delete — just deactivate
    const ann = await Announcement.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!ann) return sendError(res, 404, 'Announcement not found.');
    return sendSuccess(res, 200, 'Announcement removed.');
  } catch (err) {
    next(err);
  }
};

// ─── Helper: Broadcast SMS to matching citizens ───────────────────────────────
async function broadcastSMS(announcement, admin) {
  const villageFilter = announcement.target_villages.includes('all')
    ? {}
    : { village: { $in: announcement.target_villages } };

  const citizens = await User.find({
    ...villageFilter,
    is_active: true,
    verified:  true,
  }).select('phone').lean();

  if (citizens.length === 0) return;

  const phones  = citizens.map((c) => c.phone);
  const message = `Jimo East Notice: ${announcement.title}. ${announcement.body.substring(0, 100)}... Visit jimoeast.go.ke for details.`;

  // Africa's Talking accepts up to 1000 numbers per call
  const chunks = [];
  for (let i = 0; i < phones.length; i += 1000) {
    chunks.push(phones.slice(i, i + 1000));
  }

  let sent = 0;
  for (const chunk of chunks) {
    const result = await sendSMS(chunk, message);
    if (result.success) sent += chunk.length;
  }

  await Announcement.findByIdAndUpdate(announcement._id, {
    sms_sent:           true,
    sms_sent_at:        new Date(),
    sms_recipient_count: sent,
  });

  logger.info(`Announcement SMS broadcast complete: ${sent}/${phones.length} sent for "${announcement.title}"`);
}
