/**
 * api.js — Central API client for Jimo East Portal
 *
 * All fetch calls go through this file.
 * - Automatically attaches Authorization: Bearer <token> from localStorage
 * - Parses JSON responses uniformly
 * - Throws errors with backend message text so UI can display them
 * - Handles token expiry: clears storage and redirects to /login
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
// In dev: BASE_URL is '' so requests go to same origin → Vite proxy picks them up
// In prod: BASE_URL is 'https://api.jimoeast.go.ke'

// ─── Token helpers ────────────────────────────────────────────────────────────
export const token = {
  get:     ()      => localStorage.getItem('je_access_token'),
  set:     (t)     => localStorage.setItem('je_access_token', t),
  refresh: ()      => localStorage.getItem('je_refresh_token'),
  setRefresh: (t)  => localStorage.setItem('je_refresh_token', t),
  clear:   ()      => {
    localStorage.removeItem('je_access_token');
    localStorage.removeItem('je_refresh_token');
    localStorage.removeItem('je_user');
  },
};

// ─── Stored user helper ───────────────────────────────────────────────────────
export const storedUser = {
  get: () => {
    try { return JSON.parse(localStorage.getItem('je_user')); }
    catch { return null; }
  },
  set: (u) => localStorage.setItem('je_user', JSON.stringify(u)),
  clear: () => localStorage.removeItem('je_user'),
};

function attachHttpError(res, data, fallbackMessage) {
  const err = new Error(
    data?.message || fallbackMessage || `Request failed with status ${res.status}`
  );
  err.status = res.status;
  err.payload = data;
  if (data?.errors && Array.isArray(data.errors)) {
    err.errors = data.errors;
  }
  return err;
}

// ─── Core request function ────────────────────────────────────────────────────
async function request(method, path, body = null, options = {}) {
  const headers = {
    ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
  };

  const accessToken = token.get();
  if (accessToken && !options.skipAuth) headers['Authorization'] = `Bearer ${accessToken}`;

  const config = {
    method,
    headers,
    body: options.isFormData
      ? body                          // FormData — let browser set Content-Type
      : body ? JSON.stringify(body) : undefined,
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, config);
  } catch (networkErr) {
    const err = new Error('Network error — could not reach the server. Check your connection.');
    err.status = 0;
    throw err;
  }

  // ── Token expired: try to refresh once ────────────────────────────────────
  if (res.status === 401 && !options._retried && !options.skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request(method, path, body, { ...options, _retried: true });
    }
    // Refresh failed — clear auth and let the app handle redirect
    token.clear();
    storedUser.clear();
    window.dispatchEvent(new Event('je:logout'));
    const err = new Error('Your session has expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  const contentType = res.headers.get('Content-Type') || '';
  const isJson      = contentType.includes('application/json');

  let data = null;
  if (isJson) {
    try {
      data = await res.json();
    } catch {
      const err = new Error(`Server returned an unexpected response (${res.status})`);
      err.status = res.status;
      throw err;
    }
  }

  if (!res.ok) {
    if (data?.errors && Array.isArray(data.errors)) {
      const msgs = data.errors.map((e) => e.msg || e.message || '').filter(Boolean).join('; ');
      const err = new Error(msgs || data.message || 'Request failed');
      err.status = res.status;
      err.errors = data.errors;
      err.payload = data;
      throw err;
    }
    throw attachHttpError(
      res,
      data,
      !isJson ? `Request failed with status ${res.status}` : undefined
    );
  }

  return data; // { success: true, data: {...}, message: '...', meta: {...} }
}

async function tryRefreshToken() {
  const refreshTok = token.refresh();
  if (!refreshTok) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTok }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data?.data?.access_token || !data?.data?.refresh_token) return false;
    token.set(data.data.access_token);
    token.setRefresh(data.data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a protected binary (e.g. PDF) with Bearer auth and one refresh retry.
 * Does not parse the body as JSON.
 */
export async function fetchProtectedBlob(path, options = {}) {
  const doFetch = async (retried) => {
    const headers = {};
    const accessToken = token.get();
    if (accessToken && !options.skipAuth) headers['Authorization'] = `Bearer ${accessToken}`;

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers, ...options.fetchInit });
    } catch {
      const err = new Error('Network error — could not reach the server. Check your connection.');
      err.status = 0;
      throw err;
    }

    if (res.status === 401 && !retried && !options.skipAuth) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return doFetch(true);
      token.clear();
      storedUser.clear();
      window.dispatchEvent(new Event('je:logout'));
      const err = new Error('Your session has expired. Please sign in again.');
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      let msg = res.status === 403
        ? 'You are not authorised to download this file.'
        : res.status === 404
          ? 'File not found.'
          : `Download failed (${res.status})`;
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch { /* not JSON */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    const cd = res.headers.get('Content-Disposition') || '';
    let filename = 'document.pdf';
    const m = /filename\*=UTF-8''([^;\n]+)|filename="([^";\n]+)"|filename=([^;\n]+)/i.exec(cd);
    if (m) filename = decodeURIComponent((m[1] || m[2] || m[3] || 'document.pdf').trim());
    const blob = await res.blob();
    return { blob, filename };
  };

  return doFetch(false);
}

// ─── Convenience methods ──────────────────────────────────────────────────────
const get    = (path, opts)       => request('GET',    path, null,  opts);
const post   = (path, body, opts) => request('POST',   path, body,  opts);
const patch  = (path, body, opts) => request('PATCH',  path, body,  opts);
const put    = (path, body, opts) => request('PUT',    path, body,  opts);
const del    = (path, opts)       => request('DELETE', path, null,  opts);
const upload = (path, formData, opts = {}) =>
  request('POST', path, formData, { isFormData: true, ...opts });

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data)         => post('/api/auth/register', data),
  verifyOtp: (data)        => post('/api/auth/verify-otp', data),
  resendOtp: (data)        => post('/api/auth/resend-otp', data),
  login:    (data)         => post('/api/auth/login', data),
  logout:   ()             => post('/api/auth/logout'),
  refresh:  (refreshToken) => post('/api/auth/refresh', { refresh_token: refreshToken }),
  me:       ()             => get('/api/auth/me'),
  changePassword: (data)   => patch('/api/auth/change-password', data),
  forgotPassword: (phone)  => post('/api/auth/forgot-password', { phone }),
  resetPassword:  (data)   => post('/api/auth/reset-password', data),
};

// ─── LETTERS ──────────────────────────────────────────────────────────────────
export const letters = {
  create:       (data)           => post('/api/letters', data),
  list:         (params = {})    => get(`/api/letters?${new URLSearchParams(params)}`),
  getById:      (id)             => get(`/api/letters/${id}`),
  markReview:   (id)             => patch(`/api/letters/${id}/review`, {}),
  approve:      (id, data = {})  => patch(`/api/letters/${id}/approve`, data),
  reject:       (id, data)       => patch(`/api/letters/${id}/reject`, data),
  downloadUrl:  (id)             => `${BASE_URL}/api/letters/${id}/download`,
  /** Auth-aware download — use this instead of window.open */
  downloadFile: async (id) => fetchProtectedBlob(`/api/letters/${id}/download`),
  withdraw:     (id)             => del(`/api/letters/${id}`),
};

// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export const disputes = {
  create:          (formData, opts) => upload('/api/disputes', formData, opts || {}),
  list:            (params = {})     => get(`/api/disputes?${new URLSearchParams(params)}`),
  getById:         (id)              => get(`/api/disputes/${id}`),
  scheduleHearing: (id, data)        => patch(`/api/disputes/${id}/schedule`, data),
  resolve:         (id, data)        => patch(`/api/disputes/${id}/resolve`, data),
  update:          (id, data)        => patch(`/api/disputes/${id}`, data),
};

// ─── SECURITY REPORTS ─────────────────────────────────────────────────────────
export const security = {
  create:   (formData, opts) => upload('/api/security', formData, opts || {}),
  list:     (params = {})     => get(`/api/security?${new URLSearchParams(params)}`),
  getById:  (id)              => get(`/api/security/${id}`),
  update:   (id, data)        => patch(`/api/security/${id}`, data),
};

// ─── ILLICIT REPORTS ──────────────────────────────────────────────────────────
export const illicit = {
  create:   (formData, opts) => upload('/api/illicit', formData, opts || {}),
  list:     (params = {})    => get(`/api/illicit?${new URLSearchParams(params)}`),
  getById:  (id)             => get(`/api/illicit/${id}`),
  update:   (id, data)       => patch(`/api/illicit/${id}`, data),
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
export const announcements = {
  list:    (params = {})  => get(`/api/announcements?${new URLSearchParams(params)}`),
  getById: (id)           => get(`/api/announcements/${id}`),
  create:  (data)         => post('/api/announcements', data),
  update:  (id, data)     => patch(`/api/announcements/${id}`, data),
  remove:  (id)            => del(`/api/announcements/${id}`),
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const admin = {
  stats:            ()             => get('/api/admin/stats'),
  villages:         ()             => get('/api/admin/villages'),
  citizens:         (params = {})  => get(`/api/admin/citizens?${new URLSearchParams(params)}`),
  deactivateCitizen: (id)          => patch(`/api/admin/citizens/${id}/deactivate`, {}),
  updateRole:       (id, role)    => patch(`/api/admin/citizens/${id}/role`, { role }),
  exportData:       (params = {})  => get(`/api/admin/reports/export?${new URLSearchParams(params)}`),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notifications = {
  list:    ()   => get('/api/notifications'),
  markRead: (id) => patch(`/api/notifications/${id}/read`, {}),
  readAll:  ()   => patch('/api/notifications/read-all', {}),
};

export default { auth, letters, disputes, security, illicit, announcements, admin, notifications, token, storedUser, fetchProtectedBlob };
