import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ setPage }) {
  const { login, loading } = useAuth();
  const [form,  setForm]  = useState({ phone: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!form.phone || !form.password) {
      setError('Please enter your phone/ID and password.');
      return;
    }
    setError('');
    const result = await login(form.phone, form.password);

    if (result.success) {
      const isAdmin = ['admin', 'chief', 'assistant_chief'].includes(result.user?.role);
      setPage(isAdmin ? 'admin' : 'dashboard');
    } else {
      // 403 = phone not verified — backend re-sends OTP automatically
      if (result.raw?.status === 403 || result.message?.toLowerCase().includes('verify')) {
        sessionStorage.setItem('je_pending_phone', form.phone);
        setPage('register'); // OTP step will be shown in RegisterPage
        return;
      }
      setError(result.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 440 }}>

      {/* Logo + heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 60, height: 60, background: 'var(--forest)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', color: 'var(--gold)', fontSize: 24, fontWeight: 800,
        }}>
          JE
        </div>
        <h2>Welcome Back</h2>
        <p style={{ color: 'var(--ink-light)', fontSize: 14 }}>Sign in to access your services</p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">

          <div className="form-group">
            <label className="form-label">Phone Number / ID Number</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="07XXXXXXXX or National ID"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={handleKeyDown}
              placeholder="Your password"
            />
          </div>

          {/* Forgot password link — now navigates to real page */}
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <button
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--forest)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
              }}
              onClick={() => setPage('forgot_password')}   // ← FIXED
            >
              Forgot password?
            </button>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <><span className="pulse">⏳</span> Signing in…</> : '🔑 Sign In'}
          </button>

          <div className="divider" />

          {/* Dev credentials hint */}
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-light)' }}>
        New resident?{' '}
        <button
          style={{ background: 'none', border: 'none', color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setPage('register')}
        >
          Create Account
        </button>
      </p>
    </div>
  );
}
