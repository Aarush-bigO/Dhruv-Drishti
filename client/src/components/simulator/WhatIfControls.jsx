import React, { useState, useMemo } from 'react';
import { Settings, Play, Sparkles, Shield, AlertTriangle, Ship, Snowflake } from 'lucide-react';
import { STATIONS } from '../../utils/constants';
import { getRiskStyle } from './ImpactAnalysis';

export default function WhatIfControls({ onRunSimulation, loading }) {
  const [stationId, setStationId] = useState('BHARATI');
  const [outdoorTemp, setOutdoorTemp] = useState(-45);
  const [stormDuration, setStormDuration] = useState(240); // hours
  const [generatorsOffline, setGeneratorsOffline] = useState(0);
  const [supplyDelay, setSupplyDelay] = useState(21); // days

  // Quick Scenario Presets for 1-click evaluation
  const applyPreset = (preset) => {
    setOutdoorTemp(preset.outdoorTemp);
    setStormDuration(preset.stormDuration);
    setGeneratorsOffline(preset.generatorsOffline);
    setSupplyDelay(preset.supplyDelay);
  };

  // Live estimated risk projection while adjusting sliders
  const estimatedRisk = useMemo(() => {
    if (generatorsOffline === 2) return { tier: 'CRITICAL', score: 100 };
    
    const normStorm = Math.min(1.0, stormDuration / 720.0);
    const fStorm = Math.min(100.0, Math.pow(normStorm / 0.80, 1.35) * 82.0);
    const normDelay = Math.min(1.0, supplyDelay / 60.0);
    const fShip = Math.min(100.0, Math.pow(normDelay, 1.3) * 85.0);
    const fGen = generatorsOffline === 1 ? 42.0 : 0.0;
    const coldDelta = Math.max(0.0, Math.abs(outdoorTemp) - 20.0);
    const fTemp = Math.min(35.0, (coldDelta / 60.0) * 35.0);
    const interaction = (normStorm * normDelay) * 22.0;

    const baseComposite = (0.42 * fStorm) + (0.35 * fShip) + fGen + (0.23 * fTemp) + interaction;
    const stormAlone = Math.min(100.0, Math.pow(normStorm / 0.80, 1.35) * 85.0);
    const shipAlone = Math.min(100.0, Math.pow(normDelay / 0.80, 1.35) * 80.0) + (fGen * 0.5);

    let score = Math.max(baseComposite, stormAlone, shipAlone);
    if (generatorsOffline === 1) score = Math.max(score, 45.0 + (stormAlone * 0.4));
    score = Math.min(100.0, Math.max(0.0, Math.round(score)));

    let tier = 'LOW';
    if (score >= 82) tier = 'CRITICAL';
    else if (score >= 65) tier = 'ULTRA HIGH';
    else if (score >= 42) tier = 'HIGH';
    else if (score >= 20) tier = 'MEDIUM';

    return { tier, score };
  }, [outdoorTemp, stormDuration, generatorsOffline, supplyDelay]);

  const riskStyle = getRiskStyle(estimatedRisk.tier);

  const handleRun = () => {
    onRunSimulation({
      station_id: stationId,
      outdoor_temp: outdoorTemp,
      storm_duration_hours: stormDuration,
      generators_offline: generatorsOffline,
      supply_delay_days: supplyDelay
    });
  };

  return (
    <div className="bg-white dark:bg-polar-800 rounded-xl border border-slate-200 dark:border-polar-700 p-5 shadow-lg dark:shadow-xl h-full flex flex-col select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-polar-700">
        <div className="flex items-center gap-2">
          <Settings className="text-sky-500 dark:text-polar-accent" size={20} />
          <h2 className="text-base font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider">Scenario Parameters</h2>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${riskStyle.badge}`}>
          ● {riskStyle.label}
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pr-1 pt-3.5">
        
        {/* Quick Scenario Presets */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <Sparkles size={13} className="text-amber-400" />
            <span>QUICK CRISIS PRESETS</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => applyPreset({ outdoorTemp: -30, stormDuration: 48, generatorsOffline: 0, supplyDelay: 5 })}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-left transition-colors cursor-pointer"
            >
              🛡️ Nominal Baseline
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ outdoorTemp: -55, stormDuration: 360, generatorsOffline: 0, supplyDelay: 15 })}
              className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-left transition-colors cursor-pointer"
            >
              ❄️ Extended Blizzard (15d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ outdoorTemp: -40, stormDuration: 120, generatorsOffline: 0, supplyDelay: 45 })}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-left transition-colors cursor-pointer"
            >
              🚢 Supply Ship Blockade
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ outdoorTemp: -65, stormDuration: 480, generatorsOffline: 1, supplyDelay: 35 })}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-left transition-colors cursor-pointer"
            >
              🚨 Compound Catastrophe
            </button>
          </div>
        </div>

        {/* Station Select */}
        <div>
          <label className="block text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Target Station</label>
          <select 
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-polar-900 border border-slate-300 dark:border-polar-700 text-slate-900 dark:text-white rounded-lg p-2 text-xs font-mono outline-none focus:border-sky-400 cursor-pointer"
          >
            {Object.keys(STATIONS).map(id => (
              <option key={id} value={id}>{STATIONS[id].name}</option>
            ))}
          </select>
        </div>

        {/* Sliders */}
        <SliderControl 
          label="Outdoor Temperature" 
          value={outdoorTemp} 
          min={-80} max={-20} step={1} unit="°C"
          onChange={setOutdoorTemp} 
        />
        <SliderControl 
          label="Storm Duration (Blizzard)" 
          value={stormDuration} 
          min={0} max={720} step={24} unit="hrs"
          onChange={setStormDuration} 
          hint="Max risk threshold ~576 hrs (80%)"
        />
        <SliderControl 
          label="Generators Offline" 
          value={generatorsOffline} 
          min={0} max={2} step={1} unit="units"
          onChange={setGeneratorsOffline} 
          hint={generatorsOffline === 2 ? 'Catastrophic: Both offline!' : generatorsOffline === 1 ? 'Strained: No redundancy' : 'Nominal: Full standby'}
        />
        <SliderControl 
          label="Supply Ship Delay" 
          value={supplyDelay} 
          min={0} max={60} step={1} unit="days"
          onChange={setSupplyDelay} 
          hint="Directly impacts fuel reserve exhaustion"
        />

      </div>

      {/* Footer Run Action */}
      <div className="pt-4 mt-2 border-t border-slate-200 dark:border-polar-700 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 dark:text-slate-400">Projected Threat:</span>
          <span className={`font-bold uppercase ${riskStyle.text}`}>
            {riskStyle.label} ({estimatedRisk.score}%)
          </span>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono font-bold text-xs text-white transition-all cursor-pointer shadow-lg
            ${loading ? 'bg-slate-400 dark:bg-polar-600 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'}`}
        >
          {loading ? (
            <span className="animate-pulse">Computing Scenario Twin...</span>
          ) : (
            <>
              <Play fill="currentColor" size={15} />
              <span>Run Multi-Physics Simulation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, step, unit, onChange, hint }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
      />
      <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
        <span>{min} {unit}</span>
        {hint && <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70">{hint}</span>}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
