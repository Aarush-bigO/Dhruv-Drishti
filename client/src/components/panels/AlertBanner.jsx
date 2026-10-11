import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  const activeAlerts = alerts.filter(a => !dismissed.has(`${a.station_id}-${a.equipment_id}-${a.timestamp}`));

  // Auto-cycle every 4 seconds
  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeAlerts.length);
      setCycleKey(k => k + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeAlerts.length]);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= activeAlerts.length) {
      setCurrentIndex(0);
    }
  }, [activeAlerts.length, currentIndex]);

  const handleDismiss = useCallback((id) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % activeAlerts.length);
    setCycleKey(k => k + 1);
  }, [activeAlerts.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + activeAlerts.length) % activeAlerts.length);
    setCycleKey(k => k + 1);
  }, [activeAlerts.length]);

  if (activeAlerts.length === 0) return null;

  const displayAlert = activeAlerts[currentIndex] || activeAlerts[0];
  if (!displayAlert) return null;
  
  const isCritical = displayAlert.alert_level === 'critical';
  const id = `${displayAlert.station_id}-${displayAlert.equipment_id}-${displayAlert.timestamp}`;

  return (
    <div className="relative w-full z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={id}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`w-full flex items-center justify-between px-6 py-2.5 ${
            isCritical
              ? 'bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800'
              : 'bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800'
          }`}
        >
          {/* Left: Icon + Content */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`shrink-0 p-1.5 rounded-lg ${
              isCritical ? 'bg-red-100 dark:bg-red-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
            }`}>
              <AlertTriangle size={16} className={isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
            </div>

            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isCritical
                ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
            }`}>
              {displayAlert.alert_level}
            </span>

            <span className={`text-xs font-semibold font-mono ${
              isCritical ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {displayAlert.station_id} / {displayAlert.equipment_id}
            </span>

            <span className={`text-xs truncate ${
              isCritical ? 'text-red-600/80 dark:text-red-400/80' : 'text-amber-600/80 dark:text-amber-400/80'
            }`}>
              {isCritical ? 'Immediate action required — failure risk exceeds threshold.' : 'Anomalous behavior detected — monitor closely.'}
            </span>
          </div>

          {/* Right: Navigation + Count + Dismiss */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {activeAlerts.length > 1 && (
              <>
                <button onClick={goPrev} className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                  isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  <ChevronLeft size={14} />
                </button>
                <span className={`text-[10px] font-mono font-semibold tabular-nums ${
                  isCritical ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                }`}>
                  {currentIndex + 1} / {activeAlerts.length}
                </span>
                <button onClick={goNext} className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                  isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  <ChevronRight size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => handleDismiss(id)}
              className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                isCritical ? 'text-red-400 dark:text-red-500' : 'text-amber-400 dark:text-amber-500'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar for auto-cycle */}
      {activeAlerts.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px]">
          <div
            key={cycleKey}
            className={`h-full alert-progress ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
          />
        </div>
      )}
    </div>
  );
}
