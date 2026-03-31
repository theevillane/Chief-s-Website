import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth as authApi } from '../services/api';
import { useSubmit } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

function maskPhone(phone) {
  if (!phone) return '—';
  const p = String(phone);
  if (p.length < 8) return p;
  return `${p.slice(0, 2)}XXXXX${p.slice(-3)}`;
}

export default function AccountSettingsPage({ setPage }) {
  const { user, logout } = useAuth();
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_new_password: '' });
  const [prefs, setPrefs] = useState(() => {
    const read = (k) => {
      try { return JSON.parse(localStorage.getItem(k) || 'false'); } catch { return false; }
    };
    return {
      pref_sms_letters: read('pref_sms_letters'),
      pref_sms_disputes: read('pref_sms_disputes'),
      pref_sms_announcements: read('pref_sms_announcements'),
    };
  });

  const { submit, loading, error, success, reset } = useSubmit(authApi.changePassword);

  const strength = [
    form.new_password.length >= 8,
    /[A-Z]/.test(form.new_password),
    /\d/.test(form.new_password),
    /[^A-Za-z0-9]/.test(form.new_password),
  ].filter(Boolean).length;

  const savePref = (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    localStorage.setItem(key, JSON.stringify(value));
  };

  const doChangePassword = async () => {
    reset();
    if (form.new_password !== form.confirm_new_password) return;
    const res = await submit({ current_password: form.current_password, new_password: form.new_password });
    if (res?.success) {
      setForm({ current_password: '', new_password: '', confirm_new_password: '' });
    }
  };

  const doLogout = async () => {
    await logout();
    setPage('home');
  };

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 840 }}>
      <div className="page-header">
        <h2>Account Settings</h2>
        <p>Manage your profile, security, and notification preferences.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
            <div className="avatar avatar-lg" style={{ background: 'var(--forest-pale)', color: 'var(--forest)' }}>
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{user?.name || '—'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <span className="village-pill">{user?.village || '—'}</span>
                <span className="badge badge-blue">{user?.role || 'citizen'}</span>
                <span className="badge badge-green">✅ Verified</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-light)' }}>
            <div>ID Number: {user?.id_number || '—'}</div>
            <div>Phone: {maskPhone(user?.phone || user?.display_phone)}</div>
            <div>Joined: {user?.created_at ? formatDate(user.created_at) : '—'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ fontWeight: 700 }}>🔒 Change Password</div>
        <div className="card-body">
          {success && <div className="alert alert-success" style={{ marginBottom: 12 }}><span>✅</span><span>Password updated successfully.</span></div>}
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}><span>⚠️</span><span>{error}</span></div>}
          {[
            ['current_password', 'Current Password', 'current'],
            ['new_password', 'New Password', 'next'],
            ['confirm_new_password', 'Confirm New Password', 'confirm'],
          ].map(([key, label, skey]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={show[skey] ? 'text' : 'password'}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [skey]: !s[skey] }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none' }}
                >
                  {show[skey] ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= strength ? 'var(--forest)' : 'var(--border)' }} />
            ))}
          </div>
          {form.confirm_new_password && (
            <div style={{ fontSize: 12, color: form.new_password === form.confirm_new_password ? 'var(--forest)' : 'var(--red)', marginBottom: 10 }}>
              {form.new_password === form.confirm_new_password ? '✓ Passwords match' : '✗ Passwords do not match'}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={doChangePassword}
            disabled={loading || !form.current_password || !form.new_password || form.new_password !== form.confirm_new_password}
          >
            {loading ? '⏳ Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ fontWeight: 700 }}>🔔 Notifications</div>
        <div className="card-body">
          {[
            ['pref_sms_letters', 'SMS notifications for letter updates'],
            ['pref_sms_disputes', 'SMS notifications for dispute hearings'],
            ['pref_sms_announcements', 'Portal announcements via SMS'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input type="checkbox" checked={prefs[key]} onChange={(e) => savePref(key, e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 14 }}>{label}</span>
            </label>
          ))}
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            SMS notifications require your phone number to be registered and verified.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ fontWeight: 700 }}>Account</div>
        <div className="card-body">
          <button className="btn btn-outline btn-full" onClick={doLogout}>Sign Out</button>
          <div style={{ marginTop: 14, border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <strong style={{ color: 'var(--red)' }}>Danger Zone</strong>
            <p style={{ fontSize: 13, color: 'var(--ink-mid)', marginTop: 6 }}>
              Account deletion requires you to visit the Chief&apos;s office in person with your National ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

