import React from 'react';
import { Thermometer, Gauge, Wind, Droplets, ArrowUp, ArrowDown, Compass } from 'lucide-react';

export default function WeatherCards({ observation, history = [] }) {
  const temp = observation?.temperature_c != null ? Number(observation.temperature_c).toFixed(1) : '--';
  const pressure = observation?.pressure_hpa != null ? Number(observation.pressure_hpa).toFixed(1) : '--';
  const windMps = observation?.wind_speed_mps != null ? Number(observation.wind_speed_mps).toFixed(1) : '--';
  const windKnots = observation?.wind_speed_mps != null ? (Number(observation.wind_speed_mps) / 0.514444).toFixed(1) : '--';
  const windDeg = observation?.wind_direction_deg != null ? Math.round(Number(observation.wind_direction_deg)) : null;
  const humidity = observation?.relative_humidity_pct != null ? Number(observation.relative_humidity_pct).toFixed(1) : '--';

  // Compute the pressure delta over the closest available one-hour window.
  let pressureDelta = null;
  if (history.length > 1 && observation?.pressure_hpa != null) {
    const currentTime = Date.parse(observation.observed_at);
    const oneHourAgo = currentTime - 60 * 60 * 1000;
    const pastObs = history
      .filter((item) => item.pressure_hpa != null && Date.parse(item.observed_at) <= oneHourAgo)
      .at(-1);

    if (pastObs?.pressure_hpa != null) {
      pressureDelta = (Number(observation.pressure_hpa) - Number(pastObs.pressure_hpa)).toFixed(1);
    }
  }

  // Convert wind degrees to cardinal direction
  const getCardinal = (deg) => {
    if (deg == null) return '--';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(deg / 22.5) % 16;
    return directions[idx];
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      
      {/* 1. AIR TEMPERATURE */}
      <div className="p-3.5 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl flex flex-col justify-between hover:border-sky-500/40 transition-all min-w-0">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase truncate">Air Temp</span>
          <div className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Thermometer size={14} />
          </div>
        </div>
        <div className="my-0.5">
          <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
            {temp} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">°C</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 gap-1">
          <span className="truncate">Coast Shelf</span>
          <span className="text-sky-600 dark:text-sky-400 font-medium shrink-0">AWS</span>
        </div>
      </div>

      {/* 2. AIR PRESSURE */}
      <div className="p-3.5 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all min-w-0">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase truncate">Pressure</span>
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Gauge size={14} />
          </div>
        </div>
        <div className="my-0.5">
          <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
            {pressure} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">hPa</span>
          </div>
        </div>
        <div className="text-[10px] font-mono flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 gap-1">
          <span className="text-slate-500 dark:text-slate-400 truncate">{pressure !== '--' ? `${pressure} mb` : '--'}</span>
          {pressureDelta !== null ? (
            <span className={`flex items-center gap-0.5 font-bold shrink-0 ${Number(pressureDelta) < -3.0 ? 'text-red-500 dark:text-red-400' : Number(pressureDelta) < 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
              {Number(pressureDelta) < 0 ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
              {pressureDelta}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 text-[9px] shrink-0">1h trend</span>
          )}
        </div>
      </div>

      {/* 3. WIND SPEED & DIRECTION */}
      <div className="p-3.5 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all min-w-0">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase truncate">Wind Speed</span>
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wind size={14} />
          </div>
        </div>
        <div className="my-0.5">
          <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
            {windMps} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">m/s</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 gap-1">
          <span className="truncate">{windKnots !== '--' ? `${windKnots} kt` : '--'}</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
            {windDeg != null ? (
              <>
                <Compass size={10} style={{ transform: `rotate(${windDeg}deg)` }} />
                <span>{getCardinal(windDeg)} {windDeg}°</span>
              </>
            ) : (
              <span>{windMps !== '--' ? 'Active' : '--'}</span>
            )}
          </span>
        </div>
      </div>

      {/* 4. RELATIVE HUMIDITY */}
      <div className="p-3.5 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all min-w-0">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase truncate">Humidity</span>
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Droplets size={14} />
          </div>
        </div>
        <div className="my-0.5">
          <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
            {humidity} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">%</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 gap-1">
          <span className="truncate">State</span>
          <span className={`font-semibold shrink-0 ${humidity !== '--' && Number(humidity) > 75 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {humidity !== '--' ? (Number(humidity) > 75 ? 'Humid' : 'Normal') : '--'}
          </span>
        </div>
      </div>

    </div>
  );
}
