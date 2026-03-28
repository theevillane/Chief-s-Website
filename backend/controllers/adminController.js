'use strict';

const ServiceRequest = require('../models/ServiceRequest');
const Dispute        = require('../models/Dispute');
const SecurityReport = require('../models/SecurityReport');
const IllicitReport  = require('../models/IllicitReport');
const User           = require('../models/User');
const Announcement   = require('../models/Announcement');
const { sendSuccess, sendError, paginate } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const VALID_VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
// Dashboard KPIs
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCitizens,
      verifiedCitizens,
      totalLetters,
      approvedLetters,
      pendingLetters,
      totalDisputes,
      openDisputes,
      totalSecurity,
      urgentSecurity,
      totalIllicit,
      totalAnnouncements,
    ] = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'citizen', verified: true }),
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'approved' }),
      ServiceRequest.countDocuments({ status: { $in: ['submitted','under_review'] } }),
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: { $nin: ['resolved','closed'] } }),
      SecurityReport.countDocuments(),
      SecurityReport.countDocuments({ urgency: { $in: ['high','urgent'] }, status: { $ne: 'resolved' } }),
      IllicitReport.countDocuments(),
      Announcement.countDocuments({ is_active: true }),
    ]);

    // ── Activity trend: last 7 days ───────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyRequests = await ServiceRequest.aggregate([
      { $match: { created_at: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = dailyRequests.find((r) => r._id === key);
      trend.push({ date: key, count: found ? found.count : 0 });
    }

    return sendSuccess(res, 200, 'Dashboard statistics', {
      citizens: {
        total:    totalCitizens,
        verified: verifiedCitizens,
      },
      letters: {
        total:    totalLetters,
        approved: approvedLetters,
        pending:  pendingLetters,
      },
      disputes: {
        total: totalDisputes,
        open:  openDisputes,
      },
      security: {
        total:  totalSecurity,
        urgent: urgentSecurity,
      },
      illicit: {
        total: totalIllicit,
      },
      announcements: {
        active: totalAnnouncements,
      },
      trend,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/villages ──────────────────────────────────────────────────
// Per-village breakdown of all activity
exports.getVillageStats = async (req, res, next) => {
  try {
    const [lettersByVillage, disputesByVillage, securityByVillage, citizensByVillage] = await Promise.all([
      ServiceRequest.aggregate([
        { $group: { _id: '$village', count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status','approved'] }, 1, 0] } } } },
      ]),
      Dispute.aggregate([
        { $group: { _id: '$village', count: { $sum: 1 }, open: { $sum: { $cond: [{ $nin: ['$status',['resolved','closed']] }, 1, 0] } } } },
      ]),
      SecurityReport.aggregate([
        { $group: { _id: '$village', count: { $sum: 1 }, urgent: { $sum: { $cond: [{ $in: ['$urgency',['high','urgent']] }, 1, 0] } } } },
      ]),
      User.aggregate([
        { $match: { role: 'citizen' } },
        { $group: { _id: '$village', count: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (arr) => {
      const m = {};
      arr.forEach((r) => { m[r._id] = r; });
      return m;
    };

    const lMap = toMap(lettersByVillage);
    const dMap = toMap(disputesByVillage);
    const sMap = toMap(securityByVillage);
    const cMap = toMap(citizensByVillage);

    const stats = VALID_VILLAGES.map((village) => ({
      village,
      citizens:  cMap[village]?.count  || 0,
      letters:   lMap[village]?.count  || 0,
      letters_approved: lMap[village]?.approved || 0,
      disputes:  dMap[village]?.count  || 0,
      disputes_open: dMap[village]?.open || 0,
      security:  sMap[village]?.count  || 0,
      security_urgent: sMap[village]?.urgent || 0,
    }));

    return sendSuccess(res, 200, 'Village statistics', stats);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/citizens ──────────────────────────────────────────────────
exports.getCitizens = async (req, res, next) => {
  try {
    const { village, verified, search, page = 1, limit = 20 } = req.query;

    const filter = { role: 'citizen' };
    if (village)           filter.village  = village;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (search) {
      filter.$or = [
        { name:      { $regex: search, $options: 'i' } },
        { id_number: { $regex: search, $options: 'i' } },
        { phone:     { $regex: search, $options: 'i' } },
      ];
    }

    const total   = await User.countDocuments(filter);
    const citizens = await User
      .find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-password -refresh_token -password_reset_token -password_reset_expires');

    return sendSuccess(res, 200, 'Citizens retrieved', citizens, paginate(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/citizens/:id/deactivate ────────────────────────────────
exports.deactivateCitizen = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    ).select('-password');

    if (!user) return sendError(res, 404, 'Citizen not found.');
    logger.info(`Account deactivated: ${user._id} by admin ${req.user._id}`);
    return sendSuccess(res, 200, 'Account deactivated.', user);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/citizens/:id/role ──────────────────────────────────────
exports.updateCitizenRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['citizen','admin','chief','assistant_chief'];
    if (!validRoles.includes(role)) {
      return sendError(res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return sendError(res, 404, 'User not found.');

    logger.info(`Role updated: ${user._id} → ${role} by admin ${req.user._id}`);
    return sendSuccess(res, 200, `Role updated to '${role}'.`, user);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/reports/export ───────────────────────────────────────────
// Export all service requests as JSON (CSV conversion can be done client-side)
exports.exportData = async (req, res, next) => {
  try {
    const { type = 'letters', from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    let data;
    if (type === 'letters') {
      data = await ServiceRequest.find(
        Object.keys(dateFilter).length ? { created_at: dateFilter } : {}
      ).populate('citizen_uid', 'name phone village').lean();
    } else if (type === 'disputes') {
      data = await Dispute.find(
        Object.keys(dateFilter).length ? { created_at: dateFilter } : {}
      ).lean();
    } else if (type === 'security') {
      data = await SecurityReport.find(
        Object.keys(dateFilter).length ? { created_at: dateFilter } : {}
      ).lean();
    } else {
      return sendError(res, 400, "type must be 'letters', 'disputes', or 'security'");
    }

    return sendSuccess(res, 200, `${type} export`, data);
  } catch (err) {
    next(err);
  }
};
