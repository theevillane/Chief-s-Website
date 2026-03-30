import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];

export default function RegisterPage({ setPage }) {
  const { register, verifyOtp, resendOtp, loading } = useAuth();

  // ── ALL useState calls at the very top — no references to each other ──────
  const [step,      setStep]     = useState(1);
  const [form,      setForm]     = useState({
    name: '', id_number: '', phone: '', village: '',
    email: '', password: '', confirm: '',
  });
  const [otp,       setOtp]      = useState(['', '', '', '', '', '']);
  const [errors,    setErrors]   = useState({});
  const [apiError,  setApiErr]   = useState('');
  const [success,   setSuccess]  = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // ── Helper — defined AFTER all useState ───────────────────────────────────
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())                 e.name      = 'Full name is required';
    if (!/^\d{7,8}$/.test(form.id_number)) e.id_number = 'National ID must be 7–8 digits';
    if (!/^07\d{8}$/.test(form.phone))    e.phone     = 'Enter a valid Kenyan number (07XXXXXXXX)';
    if (!form.village)                    e.village   = 'Select your village';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.password.length < 8)          e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm)    e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    setApiErr('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      const result = await register({
        name:      form.name,
        id_number: form.id_number,
        phone:     form.phone,
        village:   form.village,
        password:  form.password,
        email:     form.email || undefined,
      });
      if (result.success) setStep(3);
      else setApiErr(result.message);
    }
  };

  const handleOTPChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleVerify = async () => {
    setApiErr('');
    const code   = otp.join('');
    const result = await verifyOtp(form.phone, code, 'registration');
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setPage('dashboard'), 1400);
    } else {
      setApiErr(result.message);
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    const result = await resendOtp(form.phone, 'registration');
    setResendMsg(result.success ? 'New OTP sent!' : result.message);
  };

  // ── Early return for success — AFTER all hooks ────────────────────────────
  if (success) return (
    <div className="page-container animate-fade" style={{ textAlign: 'center', paddingTop: 64 }}>
      <div style={{ fontSize: 64 }}>🎉</div>
      <h2 style={{ marginTop: 16 }}>Registration Successful!</h2>
      <p style={{ color: 'var(--ink-light)', marginTop: 8 }}>
        Welcome, {form.name}. Redirecting to your dashboard…
      </p>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>Create Account</h2>
        <p>Register to access all digital services from Jimo East Chief's office</p>
      </div>

      {/* Step indicator */}
      <div className="steps">
        {['Personal Info', 'Security', 'Verify Phone'].map((s, i) => (
          <div key={i} className={`step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
            <div className="step-num">{step > i + 1 ? '✓' : i + 1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* API-level error banner */}
      {apiError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>⚠️</span><span>{apiError}</span>
        </div>
      )}

      <div className="card animate-fade" key={step}>
        <div className="card-body">

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  placeholder="As on your National ID"
                  onChange={e => update('name', e.target.value)}
                />
                {errors.name && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">National ID Number *</label>
                  <input
                    className="form-input"
                    value={form.id_number}
                    placeholder="e.g. 12345678"
                    type="text"
                    inputMode="numeric"
                    onChange={e => update('id_number', e.target.value)}
                  />
                  {errors.id_number && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.id_number}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    placeholder="07XXXXXXXX"
                    type="tel"
                    onChange={e => update('phone', e.target.value)}
                  />
                  {errors.phone && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Village *</label>
                <select
                  className="form-input form-select"
                  value={form.village}
                  onChange={e => update('village', e.target.value)}
                >
                  <option value="">Select your village</option>
                  {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                {errors.village && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.village}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: 'var(--ink-faint)' }}>(Optional)</span></label>
                <input
                  className="form-input"
                  value={form.email}
                  placeholder="your@email.com"
                  type="email"
                  onChange={e => update('email', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Step 2: Password ── */}
          {step === 2 && (
            <>
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <span>ℹ️</span>
                <span>Choose a strong password with at least 8 characters</span>
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  placeholder="Min. 8 characters"
                  onChange={e => update('password', e.target.value)}
                />
                {errors.password && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  className="form-input"
                  type="password"
                  value={form.confirm}
                  placeholder="Repeat your password"
                  onChange={e => update('confirm', e.target.value)}
                />
                {errors.confirm && <span style={{ color: 'var(--red)', fontSize: 12 }}>{errors.confirm}</span>}
              </div>
            </>
          )}

          {/* ── Step 3: OTP ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
              <h3 style={{ marginBottom: 8 }}>Verify Your Phone</h3>
              <p style={{ color: 'var(--ink-light)', fontSize: 14, marginBottom: 6 }}>
                A 6-digit OTP has been sent to
              </p>
              <p style={{ fontWeight: 700, color: 'var(--forest)', marginBottom: 24 }}>{form.phone}</p>

              <div className="otp-inputs">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    className="otp-input"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e =>
                      e.key === 'Backspace' && !digit && i > 0 &&
                      document.getElementById(`otp-${i - 1}`)?.focus()
                    }
                  />
                ))}
              </div>

              <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16 }}>
                Didn't receive it?{' '}
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={handleResend}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </p>
              {resendMsg && (
                <p style={{ fontSize: 12, color: 'var(--forest)', marginTop: 8 }}>{resendMsg}</p>
              )}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {step > 1 && (
              <button
                className="btn btn-outline"
                onClick={() => { setStep(s => s - 1); setApiErr(''); }}
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                {loading ? <><span className="pulse">⏳</span> Processing…</> : 'Continue →'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleVerify}
                disabled={loading || otp.some(d => !d)}
              >
                {loading ? <><span className="pulse">⏳</span> Verifying…</> : '✅ Verify & Register'}
              </button>
            )}
          </div>

        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-light)' }}>
        Already have an account?{' '}
        <button
          style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setPage('login')}
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
