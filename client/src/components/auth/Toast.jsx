import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Wifi } from 'lucide-react';

/**
 * Toast notification component.
 * Usage: <Toast message="Welcome!" type="success" onDismiss={() => setToast(null)} />
 * Types: 'success' | 'error' | 'warning' | 'network'
 */
export default function Toast({ message, type = 'success', onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // let fade-out animation finish
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const config = {
    success: {
      icon: CheckCircle,
      classes: 'bg-emerald-950/90 border-emerald-700/60 text-emerald-300',
      iconClass: 'text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      classes: 'bg-red-950/90 border-red-700/60 text-red-300',
      iconClass: 'text-red-400',
    },
    warning: {
      icon: AlertTriangle,
      classes: 'bg-amber-950/90 border-amber-700/60 text-amber-300',
      iconClass: 'text-amber-400',
    },
    network: {
      icon: Wifi,
      classes: 'bg-slate-900/95 border-slate-700 text-slate-300',
      iconClass: 'text-slate-400',
    },
  };

  const { icon: Icon, classes, iconClass } = config[type] || config.success;

  return (
    <div
      className={`fixed top-20 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-mono font-medium max-w-sm transition-all duration-300 ${classes} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <Icon size={16} className={`shrink-0 ${iconClass}`} />
      <span>{message}</span>
    </div>
  );
}

