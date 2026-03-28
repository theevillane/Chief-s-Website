import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, token, storedUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => storedUser.get()); // hydrate from localStorage
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Listen for session expiry events fired by api.js
  useEffect(() => {
    const handleLogout = () => { setUser(null); };
    window.addEventListener('je:logout', handleLogout);
    return () => window.removeEventListener('je:logout', handleLogout);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (phone, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ phone, password });
      token.set(res.data.access_token);
      token.setRefresh(res.data.refresh_token);
      storedUser.set(res.data.user);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        message: err.message,
        status:  err.status,
        raw:     err,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Register (Step 1 + 2) ─────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register(formData);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Verify OTP (Step 3 — completes registration / login) ─────────────────
  const verifyOtp = useCallback(async (phone, otp, purpose = 'registration') => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp({ phone, otp, purpose });
      token.set(res.data.access_token);
      token.setRefresh(res.data.refresh_token);
      storedUser.set(res.data.user);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async (phone, purpose = 'registration') => {
    try {
      await authApi.resendOtp({ phone, purpose });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    token.clear();
    storedUser.clear();
    setUser(null);
  }, []);

  // ── Refresh user profile ───────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      storedUser.set(res.data);
      setUser(res.data);
    } catch { /* token may be expired — api.js handles it */ }
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isAdmin   = user?.role && ['admin', 'chief', 'assistant_chief'].includes(user.role);
  const isChief   = user?.role && ['admin', 'chief'].includes(user.role);
  const isCitizen = user?.role === 'citizen';

  return (
    <AuthContext.Provider value={{
      user, loading, error, setError,
      login, register, verifyOtp, resendOtp, logout, refreshUser,
      isAdmin, isChief, isCitizen,
      isLoggedIn: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
