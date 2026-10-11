import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Thermometer, Gauge, Wind, Droplets } from 'lucide-react';

const formatUTCTime = (isoString) => {
  try {
    const d = new Date(isoString);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  } catch {
    return '--:--';
  }
};

export default function WeatherChart({ observations = [] }) {
  const [activeParam, setActiveParam] = useState('wind');

  const { chartData, observationCount } = useMemo(() => {
    if (!observations || observations.length === 0) {
      return { chartData: [], observationCount: 0 };
    }

    // Deduplicate by timestamp and sort chronologically
    const seen = new Map();
    observations.forEach((obs) => {
      if (!obs?.observed_at) return;
      const ts = Date.parse(obs.observed_at);
      if (!Number.isFinite(ts)) return;
      if (!seen.has(ts)) {
        seen.set(ts, obs);
      }
    });

    const sorted = [...seen.values()].sort(
      (a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at)
    );

    // Map to chart points using sequential index as x-axis key
    const data = sorted.map((obs, idx) => {
      const wind = obs.wind_speed_mps != null ? Number(obs.wind_speed_mps) : null;
      const temp = obs.temperature_c != null ? Number(obs.temperature_c) : null;
      const pressure = obs.pressure_hpa != null ? Number(obs.pressure_hpa) : null;
      const humidity = obs.relative_humidity_pct != null ? Number(obs.relative_humidity_pct) : null;

      return {
        idx,
        observed_at: obs.observed_at,
        timeLabel: formatUTCTime(obs.observed_at),
        wind_speed: Number.isFinite(wind) ? wind : null,
        temperature: Number.isFinite(temp) ? temp : null,
        pressure: Number.isFinite(pressure) ? pressure : null,
        humidity: Number.isFinite(humidity) ? humidity : null,
        quality: obs.quality_status
      };
    });

    return { chartData: data, observationCount: data.length };
  }, [observations]);

  const paramConfig = {
    wind: {
      title: 'Wind Speed (m/s)',
      dataKey: 'wind_speed',
      unit: 'm/s',
      color: '#ef4444',
      domain: [0, (dMax) => Math.max(20, Math.ceil(dMax + 2))],
      fillOpacity: 0.12
    },
    pressure: {
      title: 'Air Pressure (mbar / hPa)',
      dataKey: 'pressure',
      unit: 'mbar',
      color: '#10b981',
      domain: [(dMin) => Math.floor(dMin - 1), (dMax) => Math.ceil(dMax + 1)],
      fillOpacity: 0.15
    },
    temperature: {
      title: 'Air Temperature (°C)',
      dataKey: 'temperature',
      unit: '°C',
      color: '#38bdf8',
      domain: ['auto', 'auto'],
      fillOpacity: 0.15
    },
    humidity: {
      title: 'Relative Humidity (%)',
      dataKey: 'humidity',
      unit: '%',
      color: '#06b6d4',
      domain: [0, 100],
      fillOpacity: 0.15
    }
  };

  const config = paramConfig[activeParam];

  // Pick ~8-10 evenly spaced ticks using sequential idx
  const ticks = useMemo(() => {
    if (chartData.length === 0) return [];
    const count = Math.min(9, chartData.length);
    return Array.from({ length: count }, (_, i) =>
      Math.round((i * (chartData.length - 1)) / (count - 1))
    );
  }, [chartData.length]);

  return (
    <div className="w-full bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg dark:shadow-2xl flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            24-Hour AWS Graph — NCPOR Source ({observationCount.toLocaleString()} Observations)
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {config.title}
          </h3>
        </div>

        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono gap-0.5">
          <ParamBtn active={activeParam === 'wind'} onClick={() => setActiveParam('wind')} color="red" icon={<Wind size={13} />}>Wind Speed</ParamBtn>
          <ParamBtn active={activeParam === 'pressure'} onClick={() => setActiveParam('pressure')} color="emerald" icon={<Gauge size={13} />}>Pressure</ParamBtn>
          <ParamBtn active={activeParam === 'temperature'} onClick={() => setActiveParam('temperature')} color="sky" icon={<Thermometer size={13} />}>Temperature</ParamBtn>
          <ParamBtn active={activeParam === 'humidity'} onClick={() => setActiveParam('humidity')} color="cyan" icon={<Droplets size={13} />}>Humidity</ParamBtn>
        </div>
      </div>

      <div className="h-[290px] w-full pt-4">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-2">
            <span>No AWS observation points in current window.</span>
            <span className="text-[11px] text-slate-600">
              Tip: Click 'REPLAY STORM' above to stream historical cyclone records.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${activeParam}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={config.fillOpacity} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />

              {/* Use numeric sequential idx — prevents ALL Recharts categorical/time truncation bugs */}
              <XAxis
                dataKey="idx"
                type="number"
                domain={[0, chartData.length - 1]}
                ticks={ticks}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(i) => chartData[i]?.timeLabel ?? ''}
              />

              <YAxis
                domain={config.domain}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                unit={activeParam === 'humidity' ? '%' : ''}
              />

              <Tooltip content={<ChartTooltip unit={config.unit} chartData={chartData} />} />

              <Area
                type="monotone"
                dataKey={config.dataKey}
                stroke={config.color}
                strokeWidth={1.5}
                fillOpacity={1}
                fill={`url(#grad-${activeParam})`}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ParamBtn({ active, onClick, color, icon, children }) {
  const colors = {
    red:     'bg-red-500/20     text-red-600     dark:text-red-400     border-red-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    sky:     'bg-sky-500/20     text-sky-600     dark:text-sky-400     border-sky-500/30',
    cyan:    'bg-cyan-500/20    text-cyan-600    dark:text-cyan-400    border-cyan-500/30'
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all border ${
        active
          ? colors[color]
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function ChartTooltip({ active, payload, unit, chartData }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const point = payload[0].payload;
  const value = Number(payload[0].value);
  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl font-mono text-xs space-y-1">
      <div className="text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 pb-1">
        {point.observed_at ? new Date(point.observed_at).toUTCString().slice(5, 22) + ' UTC' : '--'}
      </div>
      <div className="text-slate-900 dark:text-white font-semibold">
        Value: <span className="text-amber-500 dark:text-amber-400">{Number.isFinite(value) ? value.toFixed(2) : '--'} {unit}</span>
      </div>
      <div className="text-[10px] text-slate-400 dark:text-slate-500">
        Quality: {point.quality || 'VALID'} (NCPOR AWS)
      </div>
    </div>
  );
}
