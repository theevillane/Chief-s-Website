import { useState } from 'react';
import { auth as authApi } from '../services/api';

/**
 * ForgotPasswordPage
 *
 * 3-step flow:
 *   Step 1 — Enter phone number  → POST /api/auth/forgot-password
 *   Step 2 — Enter 6-digit OTP   → verified client-side (backend verifies on reset)
 *   Step 3 — Enter new password  → POST /api/auth/reset-password
 *
 * Backend endpoints (already implemented):
 *   POST /api/auth/forgot-password  { phone }
 *   POST /api/auth/reset-password   { phone, otp, new_password }
 *   POST /api/auth/resend-otp       { phone, purpose: 'password_reset' }
 */
export default function ForgotPasswordPage({ setPage }) {
  // ── All state at the top — no TDZ issues ────────────────────────────────
  const [step,        setStep]      = useState(1);
  const [phone,       setPhone]     = useState('');
  const [otp,         setOtp]       = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPass]   = useState('');
  const [confirm,     setConfirm]   = useState('');
  const [loading,     setLoading]   = useState(false);
  const [error,       setError]     = useState('');
  const [resendMsg,   setResendMsg] = useState('');
  const [showPass,    setShowPass]  = useState(false);
  const [showConfirm, setShowConf]  = useState(false);
  const [success,     setSuccess]   = useState(false);

  // ── Step 1: Request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    setError('');

    // Client-side phone validation
    if (!/^07\d{8}$/.test(phone.trim())) {
      setError('Enter a valid Kenyan phone number — format: 07XXXXXXXX');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(phone.trim());
      // Backend always responds generically (prevents user enumeration)
      // so we move forward regardless
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP input ────────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    // Auto-advance to next box
    if (val && i < 5) document.getElementById(`rp-otp-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`rp-otp-${i - 1}`)?.focus();
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    setError('');
    try {
      await authApi.resendOtp({ phone: phone.trim(), purpose: 'password_reset' });
      setResendMsg('A new OTP has been sent to your phone.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('rp-otp-0')?.focus();
    } catch (err) {
      setResendMsg(err.message || 'Could not resend OTP.');
    }
  };

  const handleVerifyOtp = () => {
    setError('');
    if (otp.some(d => !d)) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }
    // Move to password step — backend verifies OTP during the reset call
    setStep(3);
  };

  // ── Step 3: Set new password ─────────────────────────────────────────────
  const handleReset = async () => {
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        phone:        phone.trim(),
        otp:          otp.join(''),
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      // Common case: OTP expired or wrong — send back to step 2
      if (
        err.message?.toLowerCase().includes('otp') ||
        err.message?.toLowerCase().includes('expired') ||
        err.message?.toLowerCase().includes('invalid')
      ) {
        setError(err.message + ' — please request a new OTP.');
        setStep(2);
        setOtp(['', '', '', '', '', '']);
      } else {
        setError(err.message || 'Password reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength helper ─────────────────────────────────────────────
  const strength = {
    length:    newPassword.length >= 8,
    upper:     /[A-Z]/.test(newPassword),
    number:    /\d/.test(newPassword),
    special:   /[^A-Za-z0-9]/.test(newPassword),
  };
  const strengthScore = Object.values(strength).filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', 'var(--red)', 'var(--amber)', 'var(--gold)', 'var(--forest)'][strengthScore];

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) return (
    <div className="page-container animate-fade" style={{ maxWidth: 440, textAlign: 'center', paddingTop: 40 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ marginBottom: 8 }}>Password Reset!</h2>
      <p style={{ color: 'var(--ink-light)', fontSize: 14, marginBottom: 28 }}>
        Your password has been updated successfully. You can now sign in with your new password.
      </p>
      <button className="btn btn-primary btn-lg btn-full" onClick={() => setPage('login')}>
        🔑 Sign In Now
      </button>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="page-container animate-fade" style={{ maxWidth: 440 }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 60, height: 60, background: 'var(--forest)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', color: 'var(--gold)', fontSize: 24, fontWeight: 800,
        }}>
          {step === 1 ? '📱' : step === 2 ? '🔢' : '🔒'}
        </div>
        <h2>
          {step === 1 && 'Forgot Password'}
          {step === 2 && 'Enter OTP'}
          {step === 3 && 'Set New Password'}
        </h2>
        <p style={{ color: 'var(--ink-light)', fontSize: 14, marginTop: 4 }}>
          {step === 1 && 'Enter the phone number linked to your account'}
          {step === 2 && `OTP sent to ${phone} — check your messages`}
          {step === 3 && 'Choose a strong password for your account'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="steps" style={{ marginBottom: 24 }}>
        {['Phone', 'OTP', 'Password'].map((label, i) => (
          <div key={i} className={`step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
            <div className="step-num">{step > i + 1 ? '✓' : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* ── Step 1: Phone ── */}
      {step === 1 && (
        <div className="card animate-fade">
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-input"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                placeholder="07XXXXXXXX"
                autoFocus
              />
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                Enter the phone number you registered with
              </span>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleRequestOtp}
              disabled={loading || !phone.trim()}
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><span className="pulse">⏳</span> Sending OTP…</>
                : '📱 Send Reset OTP'}
            </button>

            <div className="divider" />

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-light)' }}>
              Remembered it?{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setPage('login')}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 2 && (
        <div className="card animate-fade">
          <div className="card-body" style={{ textAlign: 'center' }}>

            {/* OTP boxes */}
            <div className="otp-inputs" style={{ marginBottom: 20 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`rp-otp-${i}`}
                  className="otp-input"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                />
              ))}
            </div>

            {/* Resend */}
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>
              Didn't receive it?{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                onClick={handleResend}
              >
                Resend OTP
              </button>
            </p>
            {resendMsg && (
              <p style={{ fontSize: 12, color: 'var(--forest)', marginBottom: 12 }}>{resendMsg}</p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleVerifyOtp}
                disabled={otp.some(d => !d)}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: New Password ── */}
      {step === 3 && (
        <div className="card animate-fade">
          <div className="card-body">

            {/* New password */}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoFocus
                  style={{ paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, color: 'var(--ink-faint)',
                  }}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Strength meter — only shown when user has typed */}
            {newPassword.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: n <= strengthScore ? strengthColor : 'var(--border)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { ok: strength.length,  label: '8+ chars' },
                      { ok: strength.upper,   label: 'Uppercase' },
                      { ok: strength.number,  label: 'Number' },
                      { ok: strength.special, label: 'Symbol' },
                    ].map(r => (
                      <span key={r.label} style={{
                        fontSize: 11, fontWeight: 600,
                        color: r.ok ? 'var(--forest)' : 'var(--ink-faint)',
                      }}>
                        {r.ok ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                  {strengthLabel && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Confirm password */}
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="Repeat your new password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowConf(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, color: 'var(--ink-faint)',
                  }}
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Live match indicator */}
              {confirm.length > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 600, marginTop: 4,
                  color: newPassword === confirm ? 'var(--forest)' : 'var(--red)',
                }}>
                  {newPassword === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-outline"
                onClick={() => { setStep(2); setError(''); }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleReset}
                disabled={
                  loading ||
                  newPassword.length < 8 ||
                  newPassword !== confirm
                }
              >
                {loading
                  ? <><span className="pulse">⏳</span> Resetting…</>
                  : '🔒 Reset Password'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
