import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { 
  AlertTriangle, Info, CheckCircle2, Flame, Battery, 
  Thermometer, ShieldAlert, Clock, Layers, Droplets, 
  Zap, Compass, Ship, Wind
} from 'lucide-react';

export const getRiskStyle = (tier) => {
  const norm = String(tier || '').toUpperCase();
  switch (norm) {
    case 'CRITICAL':
      return {
        card: 'bg-red-500/10 text-red-500 border-red-500/40 shadow-red-500/15 shadow-md animate-pulse',
        badge: 'bg-red-500/20 text-red-400 border-red-500/50',
        text: 'text-red-500 dark:text-red-400',
        bar: 'bg-red-500',
        label: 'CRITICAL',
        color: '#ef4444'
      };
    case 'ULTRA HIGH':
    case 'ULTRA_HIGH':
      return {
        card: 'bg-orange-500/10 text-orange-500 border-orange-500/40 shadow-orange-500/15 shadow-md',
        badge: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
        text: 'text-orange-500 dark:text-orange-400',
        bar: 'bg-orange-500',
        label: 'ULTRA HIGH',
        color: '#f97316'
      };
    case 'HIGH':
      return {
        card: 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow-amber-500/10 shadow-sm',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        text: 'text-amber-500 dark:text-amber-400',
        bar: 'bg-amber-500',
        label: 'HIGH',
        color: '#f59e0b'
      };
    case 'MEDIUM':
    case 'MODERATE':
      return {
        card: 'bg-sky-500/10 text-sky-500 border-sky-500/40 shadow-sky-500/10 shadow-sm',
        badge: 'bg-sky-500/20 text-sky-400 border-sky-500/50',
        text: 'text-sky-500 dark:text-sky-400',
        bar: 'bg-sky-500',
        label: 'MEDIUM',
        color: '#38bdf8'
      };
    case 'LOW':
    default:
      return {
        card: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40 shadow-emerald-500/10 shadow-sm',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        text: 'text-emerald-500 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        label: 'LOW',
        color: '#10b981'
      };
  }
};

export default function ImpactAnalysis({ result, loading }) {
  const [activeTrace, setActiveTrace] = useState('fuel'); // 'fuel' | 'temp' | 'battery' | 'habitability'

  // Auto-switch to most critical trace based on result
  useEffect(() => {
    if (result) {
      if (result.fuel_depletion_hours === 0) {
        setActiveTrace('battery'); // Total blackout, show battery drain
      } else if (result.heating_failure_risk === 'CRITICAL' || result.heating_failure_risk === 'ULTRA HIGH') {
        setActiveTrace('temp'); // Show freezing curve
      } else {
        setActiveTrace('fuel'); // Default
      }
    }
  }, [result?.fuel_depletion_hours, result?.heating_failure_risk]);

  if (loading && !result) {
    return (
      <div className="h-full flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg dark:shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-sky-400 rounded-full animate-spin"></div>
          <p className="text-sky-500 dark:text-sky-400 font-mono text-sm font-semibold animate-pulse">Running Digital Twin Multi-Physics Simulation...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-xs p-8 shadow-lg dark:shadow-2xl">
        Adjust scenario sliders on the left and click "Run Simulation" to execute the multi-physics predictive twin.
      </div>
    );
  }

  const { 
    recommended_actions = [], 
    timeline = [], 
    blackout_risk = 'LOW', 
    blackout_risk_score = 0,
    threat_breakdown = {},
    heating_failure_risk = 'LOW', 
    fuel_depletion_hours = 0, 
    food_remaining_days = 120,
    blackout_eta_hours = 0,
    freezing_hour = null,
    resupply_deficit_days = 0,
    milestones = []
  } = result;

  const blackoutStyle = getRiskStyle(blackout_risk);
  const heatingStyle = getRiskStyle(heating_failure_risk);

  const getTraceConfig = () => {
    switch (activeTrace) {
      case 'fuel':
        return {
          title: 'Projected Bulk Fuel Reserves vs. Timeline',
          dataKey: 'fuel_remaining',
          unit: 'L',
          color: '#f59e0b',
          domain: [0, (dataMax) => Math.max(15000, Math.ceil(dataMax * 1.08))],
          refLine: 5000,
          refLabel: 'Critical Buffer (5,000L)'
        };
      case 'temp':
        return {
          title: 'Habitat Indoor Temperature Decoupling (°C)',
          dataKey: 'temp_indoor',
          unit: '°C',
          color: '#38bdf8',
          domain: [(dataMin) => Math.min(-20, Math.floor(dataMin - 5)), 25],
          refLine: 0,
          refLabel: 'Freeze Breach (0°C)'
        };
      case 'battery':
        return {
          title: 'Emergency Battery Bank SOC Discharge Curve (%)',
          dataKey: 'battery_soc',
          unit: '%',
          color: '#10b981',
          domain: [0, 100],
          refLine: 20,
          refLabel: 'Critical Cutoff (20% SOC)'
        };
      case 'habitability':
        return {
          title: 'Composite Habitat Survivability Index (%)',
          dataKey: 'habitability_index',
          unit: '%',
          color: '#a855f7',
          domain: [0, 100],
          refLine: 50,
          refLabel: 'Hazard Threshold (50%)'
        };
      default:
        return {
          title: 'Fuel Reserves',
          dataKey: 'fuel_remaining',
          unit: 'L',
          color: '#f59e0b',
          domain: [0, 'auto']
        };
    }
  };

  const config = getTraceConfig();

  return (
    <div className="h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 p-6 overflow-y-auto flex flex-col gap-5 shadow-lg dark:shadow-2xl select-none">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">Multi-Physics Digital Twin Projection</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2 mt-0.5">
            Scenario Impact & Crisis Analysis
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Projection Horizon:</span>
          <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-sky-600 dark:text-sky-400 font-bold border border-slate-200 dark:border-slate-800">
            {timeline.length > 0 ? `+${timeline[timeline.length - 1].hour} Hours` : '+96h'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-TIER COMPOSITE THREAT INDEX & FACTOR DECOMPOSITION (XAI)               */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Zap size={16} className={blackoutStyle.text} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Multi-Physics Blackout Risk Score
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {blackout_risk_score.toFixed(1)}% Threat Index
            </span>
            <span className={`text-[11px] font-mono font-bold px-3 py-0.5 rounded-full border uppercase tracking-wider ${blackoutStyle.badge}`}>
              ● {blackoutStyle.label}
            </span>
          </div>
        </div>

        {/* 5-Segment Multi-Tier Progress Track */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div className={`h-full transition-all duration-700 ease-out ${blackoutStyle.bar}`} style={{ width: `${Math.max(3, blackout_risk_score)}%` }} />
          </div>
          <div className="flex justify-between text-[9px] font-mono font-semibold pt-0.5 text-slate-400 dark:text-slate-500">
            <span className="text-emerald-500">LOW (0-20%)</span>
            <span className="text-sky-400">MED (21-42%)</span>
            <span className="text-amber-500">HIGH (43-65%)</span>
            <span className="text-orange-500">ULTRA HIGH (66-82%)</span>
            <span className="text-red-500">CRITICAL (83-100%)</span>
          </div>
        </div>

        {/* 4 Threat Pillars Breakdown */}
        {threat_breakdown && Object.keys(threat_breakdown).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
            <ThreatPillar 
              icon={<Wind size={13} className="text-sky-400" />}
              label="Blizzard Storm Stress"
              value={threat_breakdown.blizzard_stress ?? 0}
              color="bg-sky-400"
            />
            <ThreatPillar 
              icon={<Ship size={13} className="text-amber-400" />}
              label="Supply Ship Delay"
              value={threat_breakdown.ship_delay_stress ?? 0}
              color="bg-amber-400"
            />
            <ThreatPillar 
              icon={<Zap size={13} className="text-purple-400" />}
              label="Generator Redundancy"
              value={threat_breakdown.generator_stress ?? 0}
              color="bg-purple-400"
            />
            <ThreatPillar 
              icon={<Thermometer size={13} className="text-cyan-400" />}
              label="Thermal Cold Shock"
              value={threat_breakdown.thermal_stress ?? 0}
              color="bg-cyan-400"
            />
          </div>
        )}
      </div>

      {/* 4 Dynamic Risk Impact Cards with 5 Distinct Tiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RiskCard 
          icon={<Flame size={16} />}
          title="Fuel Autonomy" 
          value={fuel_depletion_hours === 0 ? '0h (Offline)' : `${fuel_depletion_hours}h`} 
          subText={fuel_depletion_hours === 0 ? 'Generators Stopped' : `${(fuel_depletion_hours / 24).toFixed(1)} days autonomy`}
          tier={fuel_depletion_hours < 72 ? 'CRITICAL' : fuel_depletion_hours < 180 ? 'ULTRA HIGH' : fuel_depletion_hours < 350 ? 'HIGH' : fuel_depletion_hours < 550 ? 'MEDIUM' : 'LOW'}
        />
        
        <RiskCard 
          icon={<Battery size={16} />}
          title="Blackout Risk" 
          value={blackout_risk} 
          subText={blackout_risk === 'CRITICAL' ? `ETA: +${blackout_eta_hours}h` : `${blackout_risk_score.toFixed(0)}% grid vulnerability`}
          tier={blackout_risk}
        />
        
        <RiskCard 
          icon={<Thermometer size={16} />}
          title="Heating Status" 
          value={heating_failure_risk} 
          subText={freezing_hour ? `0°C breach at +${freezing_hour}h` : 'Thermal Loop Stable'}
          tier={heating_failure_risk}
        />
        
        <RiskCard 
          icon={<ShieldAlert size={16} />}
          title="Rations & Supply" 
          value={`${food_remaining_days}d`} 
          subText={resupply_deficit_days > 0 ? `Deficit: ${resupply_deficit_days}d` : 'Adequate buffer'}
          tier={resupply_deficit_days > 30 ? 'CRITICAL' : resupply_deficit_days > 15 ? 'ULTRA HIGH' : resupply_deficit_days > 0 ? 'HIGH' : food_remaining_days < 60 ? 'MEDIUM' : 'LOW'}
        />
      </div>

      {/* Multi-Trace Chart Section */}
      <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl space-y-3">
        
        {/* Trace Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Layers size={14} className="text-sky-500 dark:text-sky-400" />
            <span>{config.title}</span>
          </h3>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            <button 
              onClick={() => setActiveTrace('fuel')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${activeTrace === 'fuel' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Fuel Reserves (L)
            </button>
            <button 
              onClick={() => setActiveTrace('temp')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${activeTrace === 'temp' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Indoor Temp (°C)
            </button>
            <button 
              onClick={() => setActiveTrace('battery')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${activeTrace === 'battery' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Battery SOC (%)
            </button>
            <button 
              onClick={() => setActiveTrace('habitability')}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${activeTrace === 'habitability' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Habitability Index (%)
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${activeTrace}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="hour" 
                stroke="#64748b" 
                fontSize={11} 
                tickFormatter={(val) => `+${val}h`} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                domain={config.domain} 
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px'}}
                labelFormatter={(val) => `Simulation Horizon: Hour +${val}`}
                formatter={(val) => [`${val} ${config.unit}`, config.title]}
              />
              {config.refLine != null && (
                <ReferenceLine 
                  y={config.refLine} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ position: 'insideTopLeft', value: config.refLabel, fill: '#ef4444', fontSize: 10 }} 
                />
              )}
              <Area 
                type="linear" 
                dataKey={config.dataKey} 
                stroke={config.color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#grad-${activeTrace})`} 
                isAnimationActive={false}
                activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Critical Milestones Log */}
      {milestones.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl space-y-2">
          <h3 className="text-xs font-mono font-bold text-red-500 dark:text-red-400 uppercase flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Key Scenario Milestones ({milestones.length})</span>
          </h3>
          <div className="space-y-2">
            {milestones.map((m, idx) => {
              const mStyle = getRiskStyle(m.severity || 'CRITICAL');
              return (
                <div key={idx} className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-3 bg-white dark:bg-slate-900 ${mStyle.card}`}>
                  <span className={`px-2 py-0.5 rounded font-bold shrink-0 ${mStyle.badge}`}>
                    +{m.hour}h
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{m.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${mStyle.badge}`}>
                        {mStyle.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Mitigation Protocol */}
      <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md dark:shadow-xl">
        <div className="bg-white dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} className={blackoutStyle.text} />
            <h3 className="font-mono text-xs font-bold text-slate-900 dark:text-white uppercase">Prescriptive Mitigation Protocol</h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${blackoutStyle.badge}`}>
            Target: {blackoutStyle.label} Risk Envelope
          </span>
        </div>
        <div className="p-4">
          <ul className="space-y-2.5">
            {recommended_actions.map((action, idx) => (
              <li key={idx} className="flex gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="bg-slate-100 dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 text-[10px]">
                  {idx + 1}
                </div>
                <div className="pt-0.5">{action}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}

function ThreatPillar({ icon, label, value, color }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          <span className="text-[10px] truncate">{label}</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RiskCard({ icon, title, value, subText, tier }) {
  const style = getRiskStyle(tier);

  return (
    <div className={`p-3.5 rounded-xl border ${style.card} flex flex-col justify-between transition-all duration-300`}>
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
        <span className="text-[10px] font-mono uppercase font-semibold">{title}</span>
        <span className={style.text}>{icon}</span>
      </div>
      <div className="mt-2">
        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">{value}</div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subText}</div>
      </div>
    </div>
  );
}
