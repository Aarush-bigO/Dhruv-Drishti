import React from 'react';
import { Compass } from 'lucide-react';

export default function WindRoseRadar({ observations = [] }) {
  // Aggregate observations into 16 cardinal direction bins
  const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const binCounts = new Array(16).fill(0);
  const binSpeeds = new Array(16).fill(0);

  observations.forEach(obs => {
    if (obs.wind_direction_deg != null && obs.wind_speed_mps != null) {
      const deg = Number(obs.wind_direction_deg);
      const speed = Number(obs.wind_speed_mps);
      const binIdx = Math.round(deg / 22.5) % 16;
      binCounts[binIdx] += 1;
      binSpeeds[binIdx] += speed;
    }
  });

  const maxCount = Math.max(...binCounts, 1);

  // SVG Polar Radar Geometry
  const size = 300;
  const center = size / 2;
  const maxRadius = 100;

  return (
    <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg dark:shadow-2xl flex flex-col items-center justify-between">
      
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="text-amber-500 dark:text-amber-400" size={16} />
          <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Polar Wind Rose & Direction
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">NCPOR AWS Polar Analysis</span>
      </div>

      {/* SVG Polar Radar */}
      <div className="relative my-3 flex items-center justify-center">
        <svg width={size} height={size} className="overflow-visible">
          
          {/* Concentric Range Rings */}
          {[25, 50, 75, 100].map((percent, idx) => {
            const r = (maxRadius * percent) / 100;
            return (
              <g key={percent}>
                <circle 
                  cx={center} 
                  cy={center} 
                  r={r} 
                  fill="none" 
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1" 
                  strokeDasharray="2 3"
                />
                <text 
                  x={center + 4} 
                  y={center - r + 10} 
                  fill="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  fontSize="8" 
                  fontFamily="monospace"
                >
                  {(idx + 1) * 7.5} kt
                </text>
              </g>
            );
          })}

          {/* Radial Axis Spokes */}
          {sectors.map((name, i) => {
            const angle = (i * 22.5 - 90) * (Math.PI / 180);
            const x2 = center + Math.cos(angle) * maxRadius;
            const y2 = center + Math.sin(angle) * maxRadius;
            const labelX = center + Math.cos(angle) * (maxRadius + 16);
            const labelY = center + Math.sin(angle) * (maxRadius + 16) + 3;

            return (
              <g key={name}>
                <line x1={center} y1={center} x2={x2} y2={y2} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                {i % 2 === 0 && (
                  <text 
                    x={labelX} 
                    y={labelY} 
                    fill="currentColor"
                    className="text-slate-600 dark:text-slate-400"
                    fontSize="9" 
                    fontWeight="bold" 
                    fontFamily="monospace" 
                    textAnchor="middle"
                  >
                    {name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Wind Petals / Wedges */}
          {sectors.map((name, i) => {
            const count = binCounts[i];
            if (count === 0) return null;

            const avgSpeed = binSpeeds[i] / count;
            const radius = (count / maxCount) * maxRadius;
            const startAngle = ((i - 0.4) * 22.5 - 90) * (Math.PI / 180);
            const endAngle = ((i + 0.4) * 22.5 - 90) * (Math.PI / 180);

            const x1 = center + Math.cos(startAngle) * radius;
            const y1 = center + Math.sin(startAngle) * radius;
            const x2 = center + Math.cos(endAngle) * radius;
            const y2 = center + Math.sin(endAngle) * radius;

            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
            const color = avgSpeed > 15 ? '#ef4444' : avgSpeed > 10 ? '#f59e0b' : avgSpeed > 5 ? '#38bdf8' : '#10b981';

            return (
              <path
                key={i}
                d={pathData}
                fill={color}
                fillOpacity="0.75"
                stroke={color}
                strokeWidth="1"
              >
                <title>{`${name}: ${count} obs, avg ${avgSpeed.toFixed(1)} m/s`}</title>
              </path>
            );
          })}

          {/* Central Hub */}
          <circle cx={center} cy={center} r={4} fill="#38bdf8" />
        </svg>
      </div>

      <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span>Prevailing: <strong className="text-slate-900 dark:text-white font-bold">{sectors[binCounts.indexOf(Math.max(...binCounts))] || 'Variable'}</strong></span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;5m/s</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> 5-10</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 10-15</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;15</span>
        </div>
      </div>

    </div>
  );
}
