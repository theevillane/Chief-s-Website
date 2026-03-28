import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ setPage }) {
  const { login, loading } = useAuth();
  const [form, setForm]   = useState({ phone: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!form.phone || !form.password) {
      setError('Please enter your phone/ID and password.');
      return;
    }
    setError('');
    const result = await login(form.phone.trim(), form.password);

    // Phone not verified: backend returns 403 and sends a new OTP — go to OTP screen
    if (!result.success && (result.status === 403 || /not verified|verify your phone|OTP has been sent/i.test(result.message || ''))) {
      sessionStorage.setItem('je_pending_phone', form.phone.trim());
      sessionStorage.setItem('je_otp_purpose', 'registration');
      setPage('verify_phone');
      return;
    }

    if (result.success) {
      setPage(
        result.user?.role && ['admin', 'chief', 'assistant_chief'].includes(result.user.role)
          ? 'admin'
          : 'dashboard'
      );
    } else {
      setError(result.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width:60, height:60, background:'var(--forest)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'var(--gold)', fontSize:24, fontWeight:800 }}>JE</div>
        <h2>Welcome Back</h2>
        <p style={{ color:'var(--ink-light)', fontSize:14 }}>Sign in to access your services</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom:16 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Phone Number / ID Number</label>
            <input className="form-input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="07XXXXXXXX or National ID" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="Your password" />
          </div>
          <div style={{ textAlign:'right', marginBottom:16 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize:13, color:'var(--forest)' }}
              onClick={() => setPage('forgot_password')}>
              Forgot password?
            </button>
          </div>
          <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="pulse">⏳</span> Signing in...</> : '🔑 Sign In'}
          </button>
          <div className="divider" />
          <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:12, fontSize:12, color:'var(--ink-light)' }}>
            <div style={{ fontWeight:600, marginBottom:4, color:'var(--ink-mid)' }}>🧪 Seeded Test Credentials</div>
            <div>Citizen: <code>0712345678</code> / <code>Test@1234</code></div>
            <div>Admin:   <code>0700000001</code> / <code>ChiefAdmin@2025</code></div>
          </div>
        </div>
      </div>

      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--ink-light)' }}>
        New resident?{' '}
        <button className="btn btn-ghost btn-sm" style={{ color:'var(--forest)', fontWeight:600 }}
          onClick={() => setPage('register')}>
          Create Account
        </button>
      </p>
    </div>
  );
}
