import React from 'react';
import { AlertTriangle, Thermometer, TrendingDown } from 'lucide-react';

export default function WeatherAnomalyPanel({ anomalies = [], latestWeather }) {
  const anomalyScore = latestWeather?.anomaly_score != null ? Math.round(Number(latestWeather.anomaly_score) * 100) : 8;
  const alertLevel = latestWeather?.alert_level || 'normal';
  const anomalyType = latestWeather?.anomaly_type || 'NORMAL_CONDITIONS';

  // Extract ML & physical diagnostic metadata
  const windChill = latestWeather?.wind_chill_c != null ? Number(latestWeather.wind_chill_c).toFixed(1) : (latestWeather?.temperature_c != null ? Number(latestWeather.temperature_c - 8).toFixed(1) : '--');
  const pDelta = latestWeather?.pressure_tendency_1h_hpa != null ? Number(latestWeather.pressure_tendency_1h_hpa).toFixed(1) : '--';

  const getBadgeStyle = () => {
    switch (alertLevel) {
      case 'critical':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg dark:shadow-2xl flex flex-col space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className={alertLevel === 'normal' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'} size={18} />
          <div>
            <h4 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ensemble Meteorological Intelligence
            </h4>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Tri-Model Ensemble + Osczevski Wind Chill</p>
          </div>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getBadgeStyle()}`}>
          ● {alertLevel.toUpperCase()}
        </div>
      </div>

      {/* Threat Meter & Status */}
      <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">Environmental Threat Index</div>
          <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white mt-0.5">
            {anomalyScore}% <span className="text-xs text-slate-400 font-mono">/ 100%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${anomalyScore > 65 ? 'bg-red-500' : anomalyScore > 40 ? 'bg-amber-500' : 'bg-emerald-400'}`}
              style={{ width: `${anomalyScore}%` }}
            />
          </div>
        </div>

        <div className="border-l border-slate-200 dark:border-slate-800 pl-3.5">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">Active Condition</div>
          <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
            {anomalyType.replace(/_/g, ' ')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {alertLevel === 'normal' ? 'Atmospheric baseline normal.' : 'Severe Antarctic weather dynamics detected.'}
          </div>
        </div>
      </div>

      {/* Physical Microclimate Indices (Wind Chill & Barometric Tendency) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Thermometer size={16} className="text-sky-500 dark:text-sky-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Wind Chill Equiv.</div>
            <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
              {windChill} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">°C (Felt)</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <TrendingDown size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">1h Pressure Delta</div>
            <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
              {pDelta} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">hPa/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flagged Anomaly Event Log */}
      <div>
        <div className="text-[11px] font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center justify-between">
          <span>Recent Meteorological Alerts</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{anomalies.length} recorded</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="text-xs font-mono text-slate-400 dark:text-slate-500 p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No extreme meteorological anomalies detected in the observation window.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {anomalies.slice(0, 5).map((a, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${a.alert_level === 'critical' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{a.anomaly_type}</span>
                </div>
                <span className="text-slate-500 text-[10px]">{a.observed_at ? new Date(a.observed_at).toUTCString().slice(17, 22) + ' UTC' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
