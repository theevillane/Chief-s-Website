import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * OTP verification for: (1) new registration step 3, or (2) login when phone not yet verified (403).
 * Phone is read from sessionStorage set by RegisterPage or LoginPage.
 */
export default function VerifyPhonePage({ setPage }) {
  const { verifyOtp, resendOtp, loading } = useAuth();
  const [phone, setPhone] = useState(() => sessionStorage.getItem('je_pending_phone') || '');
  const [purpose] = useState(() => sessionStorage.getItem('je_otp_purpose') || 'registration');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [apiError, setApiErr] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    const p = sessionStorage.getItem('je_pending_phone');
    if (p) setPhone(p);
    if (!p) setApiErr('No phone number to verify. Please sign in again.');
  }, []);

  const handleOTPChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`vo-otp-${i + 1}`)?.focus();
  };

  const handleVerify = async () => {
    setApiErr('');
    const code = otp.join('');
    if (code.length !== 6 || !phone) {
      setApiErr('Enter the complete 6-digit code.');
      return;
    }
    const result = await verifyOtp(phone.trim(), code, purpose);
    if (result.success) {
      sessionStorage.removeItem('je_pending_phone');
      sessionStorage.removeItem('je_otp_purpose');
      const adminRoles = ['admin', 'chief', 'assistant_chief'];
      setPage(adminRoles.includes(result.user?.role) ? 'admin' : 'dashboard');
    } else {
      setApiErr(result.message || 'Verification failed.');
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    if (!phone) return;
    const result = await resendOtp(phone.trim(), purpose);
    setResendMsg(result.success ? 'New OTP sent!' : result.message);
  };

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 440 }}>
      <div className="page-header">
        <h2>Verify your phone</h2>
        <p>Enter the 6-digit code we sent to complete sign-in.</p>
      </div>

      {apiError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>⚠️</span><span>{apiError}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              type="tel"
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-light)', marginBottom: 16 }}>
            OTP was sent to this number. You can edit it if you used a different format when signing up.
          </p>
          <div className="otp-inputs">
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`vo-otp-${i}`}
                className="otp-input"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOTPChange(i, e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Backspace' && !digit && i > 0 && document.getElementById(`vo-otp-${i - 1}`)?.focus()
                }
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
            Didn&apos;t receive it?{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleResend}
              disabled={loading}
            >
              Resend OTP
            </button>
          </p>
          {resendMsg && <p style={{ fontSize: 12, color: 'var(--forest)', marginTop: 8 }}>{resendMsg}</p>}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => setPage('login')}>
              ← Back to sign in
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={loading || otp.some((d) => !d)}
            >
              {loading ? '⏳ Verifying…' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
