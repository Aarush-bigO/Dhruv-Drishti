import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Zap, User, Mail, Building2, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Inline form field component ──────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, error, placeholder, icon: Icon, rightElement }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon size={14} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-slate-900 border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all
            ${Icon ? 'pl-9' : ''}
            ${rightElement ? 'pr-10' : ''}
            ${error
              ? 'border-red-500/70 focus:border-red-400 ring-1 ring-red-500/20'
              : 'border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'
            }`}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono">
          <AlertCircle size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Auth Modal ───────────────────────────────────────────────────────────
export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'

  // Sign In state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siError, setSiError] = useState('');
  const [siLoading, setSiLoading] = useState(false);
  const [siEmailErr, setSiEmailErr] = useState('');
  const [siPasswordErr, setSiPasswordErr] = useState('');

  // Sign Up state
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suInstitution, setSuInstitution] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirmPw, setSuConfirmPw] = useState('');
  const [suShowPw, setSuShowPw] = useState(false);
  const [suShowConfirmPw, setSuShowConfirmPw] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState('');
  const [suFieldErrors, setSuFieldErrors] = useState({});

  const modalRef = useRef(null);

  // ─── Close on Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ─── Reset on tab switch ────────────────────────────────────────────────────
  const switchTab = (t) => {
    setTab(t);
    setSiError(''); setSiEmailErr(''); setSiPasswordErr('');
    setSuError(''); setSuFieldErrors({});
  };

  // ─── Demo quick-fill ────────────────────────────────────────────────────────
  const handleQuickFill = async () => {
    setSiEmail('researcher@polar.res.in');
    setSiPassword('polar2026');
    setSiError('');
    setSiEmailErr('');
    setSiPasswordErr('');
    setSiLoading(true);
    const result = await login('researcher@polar.res.in', 'polar2026');
    setSiLoading(false);
    if (result.success) {
      onSuccess(result.user);
    } else {
      setSiError(result.error);
    }
  };

  // ─── Email validator ────────────────────────────────────────────────────────
  const isValidEmail = (e) => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(e);

  // ─── Sign In submit ─────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    let valid = true;
    setSiEmailErr(''); setSiPasswordErr(''); setSiError('');
    if (!siEmail.trim()) { setSiEmailErr('Email is required'); valid = false; }
    else if (!isValidEmail(siEmail.trim())) { setSiEmailErr('Enter a valid email address'); valid = false; }
    if (!siPassword) { setSiPasswordErr('Password is required'); valid = false; }
    if (!valid) return;

    setSiLoading(true);
    const result = await login(siEmail.trim(), siPassword);
    setSiLoading(false);
    if (result.success) {
      onSuccess(result.user);
    } else {
      setSiError(result.error);
    }
  };

  // ─── Sign Up validation ─────────────────────────────────────────────────────
  const validateSignUp = () => {
    const errors = {};
    if (!suName.trim() || suName.trim().length < 2) errors.name = 'Full name must be at least 2 characters';
    if (!suEmail.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(suEmail.trim())) errors.email = 'Enter a valid email address';
    if (!suPassword) errors.password = 'Password is required';
    else if (suPassword.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/\d/.test(suPassword)) errors.password = 'Password must contain at least one number';
    if (!suConfirmPw) errors.confirmPw = 'Please confirm your password';
    else if (suPassword !== suConfirmPw) errors.confirmPw = 'Passwords do not match';
    return errors;
  };

  // ─── Sign Up submit ─────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    const errors = validateSignUp();
    setSuFieldErrors(errors);
    setSuError('');
    if (Object.keys(errors).length > 0) return;

    setSuLoading(true);
    const result = await register(suName.trim(), suEmail.trim(), suInstitution.trim(), suPassword);
    setSuLoading(false);
    if (result.success) {
      onSuccess(result.user);
    } else {
      // Map duplicate email error to the field
      if (result.error?.includes('already exists')) {
        setSuFieldErrors(prev => ({ ...prev, email: 'An account with this email already exists' }));
      } else {
        setSuError(result.error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-[#090f1e] border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-1">
                🧊 Antarctic Research Portal
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {tab === 'signin' ? 'Researcher Sign In' : 'Create Researcher Account'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Tab switcher ── */}
          <div className="flex gap-1 mt-4 bg-slate-800/60 rounded-lg p-1">
            <button
              onClick={() => switchTab('signin')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                tab === 'signin'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                tab === 'signup'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">

          {/* ===================== SIGN IN TAB ===================== */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4" noValidate>

              {/* Quick Demo Login */}
              <button
                type="button"
                onClick={handleQuickFill}
                disabled={siLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono tracking-wide hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                <Zap size={14} />
                ⚡ Quick Demo Login (researcher@polar.res.in)
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] text-slate-600 font-mono">or sign in manually</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <Field
                label="Research Email"
                type="email"
                value={siEmail}
                onChange={(e) => { setSiEmail(e.target.value); setSiEmailErr(''); }}
                error={siEmailErr}
                placeholder="you@ncpor.res.in"
                icon={Mail}
              />

              <Field
                label="Password"
                type={siShowPw ? 'text' : 'password'}
                value={siPassword}
                onChange={(e) => { setSiPassword(e.target.value); setSiPasswordErr(''); }}
                error={siPasswordErr}
                placeholder="Enter your password"
                icon={Lock}
                rightElement={
                  <button type="button" onClick={() => setSiShowPw(p => !p)} className="text-slate-500 hover:text-slate-300">
                    {siShowPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {siError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 font-mono">
                  <AlertCircle size={13} />
                  {siError}
                </div>
              )}

              <button
                type="submit"
                disabled={siLoading}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                {siLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* ===================== SIGN UP TAB ===================== */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-4" noValidate>

              <Field
                label="Full Name"
                value={suName}
                onChange={(e) => { setSuName(e.target.value); setSuFieldErrors(p => ({ ...p, name: '' })); }}
                error={suFieldErrors.name}
                placeholder="Dr. Aditi Sharma"
                icon={User}
              />

              <Field
                label="Research Email"
                type="email"
                value={suEmail}
                onChange={(e) => { setSuEmail(e.target.value); setSuFieldErrors(p => ({ ...p, email: '' })); }}
                error={suFieldErrors.email}
                placeholder="aditi@ncpor.res.in"
                icon={Mail}
              />

              <Field
                label="Institution (optional)"
                value={suInstitution}
                onChange={(e) => setSuInstitution(e.target.value)}
                placeholder="NCPOR / MoES / IISc"
                icon={Building2}
              />

              <Field
                label="Password"
                type={suShowPw ? 'text' : 'password'}
                value={suPassword}
                onChange={(e) => { setSuPassword(e.target.value); setSuFieldErrors(p => ({ ...p, password: '' })); }}
                error={suFieldErrors.password}
                placeholder="Min 8 chars, at least 1 number"
                icon={Lock}
                rightElement={
                  <button type="button" onClick={() => setSuShowPw(p => !p)} className="text-slate-500 hover:text-slate-300">
                    {suShowPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              <Field
                label="Confirm Password"
                type={suShowConfirmPw ? 'text' : 'password'}
                value={suConfirmPw}
                onChange={(e) => { setSuConfirmPw(e.target.value); setSuFieldErrors(p => ({ ...p, confirmPw: '' })); }}
                error={suFieldErrors.confirmPw}
                placeholder="Repeat your password"
                icon={Lock}
                rightElement={
                  <button type="button" onClick={() => setSuShowConfirmPw(p => !p)} className="text-slate-500 hover:text-slate-300">
                    {suShowConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {suError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 font-mono">
                  <AlertCircle size={13} />
                  {suError}
                </div>
              )}

              <button
                type="submit"
                disabled={suLoading}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                {suLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="px-6 pb-5 text-center">
          <p className="text-[10px] text-slate-600 font-mono">
            Access restricted to NCPOR / MoES authorized researchers.
          </p>
        </div>
      </div>
    </div>
  );
}

