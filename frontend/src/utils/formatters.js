/**
 * formatters.js
 *
 * Fixes ALL data contract mismatches between the Express backend
 * and the React frontend, in one place.
 */

// ── Date formatting ───────────────────────────────────────────────────────────
// Backend: ISO string "2025-03-10T09:23:11.000Z"
// Frontend expects: "10 Mar 2025"
export const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return isoStr;
  }
};

export const formatDateTime = (isoStr) => {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

export const timeAgo = (isoStr) => {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ── Normalize MongoDB _id to id ───────────────────────────────────────────────
// Backend returns { _id: "665f..." }, frontend uses .id
export const normalizeId = (doc) => {
  if (!doc) return doc;
  if (typeof doc !== 'object') return doc;
  const normalized = { ...doc, id: doc._id || doc.id };
  return normalized;
};

export const normalizeList = (docs) => (docs || []).map(normalizeId);

// ── Announcement: normalize backend category → frontend display type ──────────
// Backend categories: baraza | health | government | development | security | general
// Frontend filter keys: all | urgent | health | gov | dev | security | baraza
const CATEGORY_TO_DISPLAY = {
  baraza:      'baraza',
  health:      'health',
  government:  'gov',
  development: 'dev',
  security:    'security',
  general:     'general',
};
const DISPLAY_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_DISPLAY).map(([k, v]) => [v, k])
);

export const normAnnouncement = (ann) => {
  if (!ann) return ann;
  return {
    ...normalizeId(ann),
    // Map backend category to the short key the frontend filter uses
    type:    CATEGORY_TO_DISPLAY[ann.category] || ann.category || 'general',
    // Friendly date string from ISO created_at
    date:    formatDate(ann.created_at || ann.published_at),
    // target_villages may be ['all'] or list of village names
    village: (ann.target_villages || []).some((v) => String(v).toLowerCase() === 'all')
               ? 'All Villages'
               : (ann.target_villages || []).length
                 ? (ann.target_villages || []).join(', ')
                 : 'All Villages',
  };
};

export const normAnnouncementList = (docs) => (docs || []).map(normAnnouncement);

// Map display type back to backend category for filter requests
export const displayTypeToCategory = (displayType) =>
  DISPLAY_TO_CATEGORY[displayType] || displayType;

// ── ServiceRequest: normalize to what the frontend table expects ──────────────
// Backend: { _id, ref_number, letter_type, type_label, citizen_name, village,
//            created_at, status, urgency }
// Frontend table: { id, type, citizen, village, date, status, urgency }
export const normLetter = (req) => {
  if (!req) return req;
  const citizenObj = req.citizen_uid; // populated object or string UID
  const mid = req._id;
  return {
    ...normalizeId(req),
    id:      req.ref_number || (mid && String(mid)) || req.id,          // human-readable ref for display
    _mongoId: mid != null ? String(mid) : null,                        // mongo id for API calls
    type:    req.type_label || req.letter_type || 'Letter',
    citizen: req.citizen_name
             || (typeof citizenObj === 'object' && citizenObj?.name ? citizenObj.name : null)
             || 'Unknown',
    village: req.village
             || (typeof citizenObj === 'object' ? citizenObj?.village : null)
             || '—',
    date:    formatDate(req.created_at),
    status:  req.status || 'submitted',
    urgency: req.urgency || 'normal',
    pdf_url: req.letter_pdf_url || null,
  };
};

export const normLetterList = (docs) => (docs || []).map(normLetter);

// ── Dispute: normalize for display ───────────────────────────────────────────
export const normDispute = (d) => {
  if (!d) return d;
  return {
    ...normalizeId(d),
    id:      d.ref_number || d._id,
    _mongoId: d._id,
    date:    formatDate(d.created_at),
    hearing_date_str: d.hearing_date ? formatDate(d.hearing_date) : null,
  };
};

// ── Security report ───────────────────────────────────────────────────────────
export const normSecurity = (s) => ({
  ...normalizeId(s),
  id:   s.ref_number || s._id,
  _mongoId: s._id,
  date: formatDate(s.created_at),
});

// ── Admin stats: map backend response to frontend KPI shape ──────────────────
// Backend: { letters: { total, approved, pending }, disputes: {}, security: {}, ... }
// Frontend kpis: [{ n, label, change, color }]
export const buildKpis = (stats) => {
  if (!stats || typeof stats !== 'object') return [];
  return [
    {
      n:      stats.letters?.total  || 0,
      label:  'Total Requests',
      change: `${stats.letters?.pending || 0} pending review`,
      color:  'var(--forest)',
    },
    {
      n:      stats.letters?.approved || 0,
      label:  'Letters Approved',
      change: `${stats.letters?.pending || 0} awaiting`,
      color:  '#2ECC71',
    },
    {
      n:      stats.disputes?.open  || 0,
      label:  'Open Disputes',
      change: `${stats.disputes?.total || 0} total`,
      color:  'var(--amber)',
    },
    {
      n:      stats.security?.total || 0,
      label:  'Security Reports',
      change: stats.security?.urgent
                ? `⚠ ${stats.security.urgent} urgent`
                : 'No urgent',
      color:  'var(--red)',
    },
  ];
};

// ── Village stats: map backend /api/admin/villages to frontend VILLAGE_STATS shape
// Backend: { village, letters, disputes, security, citizens }
// Frontend: { village, requests, disputes, security }
export const normVillageStats = (data) =>
  (data || []).map((v) => ({
    village:  v.village,
    requests: v.letters        || 0,
    disputes: v.disputes       || 0,
    security: v.security       || 0,
    citizens: v.citizens       || 0,
    approved: v.letters_approved || 0,
  }));
