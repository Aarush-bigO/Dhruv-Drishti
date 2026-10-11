import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while validating stored token on mount

  // ─── On mount: restore session from localStorage ──────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('pt_token');
    if (storedToken) {
      validateToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // ─── Validate token with backend /me endpoint ─────────────────────────────
  const validateToken = useCallback(async (t) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setToken(t);
      } else {
        // Token expired or invalid — clear silently
        localStorage.removeItem('pt_token');
        setUser(null);
        setToken(null);
        // Return special flag so App.jsx can show "session expired" toast
        return 'expired';
      }
    } catch {
      // Network error — keep token, will retry next time
      localStorage.removeItem('pt_token');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Sign In ──────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('pt_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return { success: true, user: data.user };
      }

      // Specific error messages from backend
      if (res.status === 401) return { success: false, error: 'Invalid email or password.' };
      if (res.status === 422) return { success: false, error: 'Please check your input and try again.' };
      return { success: false, error: data.detail || 'Login failed. Please try again.' };

    } catch {
      return { success: false, error: 'Cannot connect to server. Is the backend running?' };
    }
  }, []);

  // ─── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (full_name, email, institution, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          institution: institution.trim(),
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('pt_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return { success: true, user: data.user };
      }

      if (res.status === 409) return { success: false, error: 'An account with this email already exists.' };
      if (res.status === 422) {
        // Pydantic validation errors
        const msgs = data.detail?.map?.(e => e.msg).join('. ') || 'Validation error. Please check your input.';
        return { success: false, error: msgs };
      }
      return { success: false, error: data.detail || 'Registration failed. Please try again.' };

    } catch {
      return { success: false, error: 'Cannot connect to server. Is the backend running?' };
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('pt_token');
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

