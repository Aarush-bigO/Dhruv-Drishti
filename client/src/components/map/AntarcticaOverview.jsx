import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowUpRight, Cloud, Compass, HeartPulse, Orbit,
  Radio, Satellite, ServerCog, Wind
} from 'lucide-react';
import InteractiveGlobe from './InteractiveGlobe';

function StationCard({ station, metrics, accent, onClick, onHover }) {
  const active = accent === 'rose';
  const statusClass = active ? 'text-rose-300 border-rose-500/30 bg-rose-500/10' : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  const ringClass = active ? 'border-rose-500/70 shadow-rose-950/40' : 'border-emerald-400/70 shadow-emerald-950/40';
  const dotClass = active ? 'bg-rose-400 shadow-rose-500/70' : 'bg-emerald-400 shadow-emerald-500/70';

  return (
    <motion.button
      type="button"
      whileHover={{ x: 5, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 23 }}
      onClick={onClick}
      onMouseEnter={() => onHover(station.id)}
      onMouseLeave={() => onHover(null)}
      className={`w-full rounded-xl border p-4 text-left backdrop-blur-xl shadow-xl transition-all ${ringClass} bg-[#071525]/80 hover:bg-[#0b1b2e]/95`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.09em] text-slate-100">
          <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_12px] ${dotClass}`} />
          {station.name.toUpperCase()}
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider ${statusClass}`}>
          ● {metrics.status}
        </span>
      </div>
      <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-2">
        <div className="border-r border-sky-900/60">
          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Temperature</div>
          <div className="mt-0.5 text-[29px] font-bold leading-none tracking-tight text-white">{Number(metrics.temp) > 0 ? '+' : ''}{metrics.temp}°C</div>
        </div>
        <div className="pl-1">
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-sky-300"><Wind size={12} /> Wind</div>
          <div className="mt-1 font-mono text-xs font-semibold text-slate-100">{metrics.wind} km/h</div>
        </div>
        <div className="border-l border-sky-900/60 pl-2">
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-sky-300"><HeartPulse size={12} /> Health</div>
          <div className={`mt-1 font-mono text-lg font-bold ${metrics.health >= 75 ? 'text-emerald-300' : 'text-amber-300'}`}>{metrics.health}%</div>
        </div>
      </div>
    </motion.button>
  );
}

function TwinStationsPanel({ maitri, bharati }) {
  return (
    <aside className="absolute right-7 top-9 z-20 hidden w-[270px] rounded-xl border border-sky-800/60 bg-[#061221]/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl xl:block">
      <div className="flex items-center gap-3 border-b border-sky-900/70 pb-4">
        <div className="rounded-lg border border-sky-500/45 bg-sky-500/10 p-2 text-sky-300"><Orbit size={25} /></div>
        <div>
          <h2 className="text-sm font-semibold text-white">Twin Stations</h2>
          <p className="mt-0.5 text-[11px] text-sky-200/75">Two points. One mission.</p>
        </div>
      </div>
      <div className="space-y-3 border-b border-sky-900/70 py-4">
        {[
          { name: 'Bharati (India)', metrics: bharati, coordinates: '69.23°S, 76.12°E', color: 'bg-emerald-400' },
          { name: 'Maitri (India)', metrics: maitri, coordinates: '70.77°S, 11.73°E', color: 'bg-rose-500' }
        ].map((station) => (
          <div className="flex items-center gap-3" key={station.name}>
            <span className={`h-3 w-3 rounded-full ${station.color} shadow-[0_0_12px]`} />
            <div><div className="text-sm font-medium text-slate-100">{station.name}</div><div className="font-mono text-[10px] text-sky-200/70">{station.coordinates} · {station.metrics.status}</div></div>
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-4">
        <div className="flex items-start gap-3"><Satellite className="mt-0.5 text-sky-300" size={20} /><div><div className="text-xs font-medium text-sky-200">Satellite Link</div><div className="text-xs text-slate-400">Live</div></div></div>
        <div className="flex items-start gap-3"><Radio className="mt-0.5 text-sky-300" size={20} /><div><div className="text-xs font-medium text-sky-200">Data Flow</div><div className="text-xs text-slate-400">Active</div></div></div>
        <div className="flex items-start gap-3"><Cloud className="mt-0.5 text-sky-300" size={20} /><div><div className="text-xs font-medium text-sky-200">Global Insights</div><div className="text-xs text-slate-400">In Progress</div></div></div>
      </div>
    </aside>
  );
}

export default function AntarcticaOverview({ onStationSelect, liveData = {}, stationWeather = {} }) {
  const [hoveredStation, setHoveredStation] = useState(null);
  const maitriWeather = stationWeather.MAITRI || {};
  const bharatiWeather = stationWeather.BHARATI || {};
  const maitriTelemetry = liveData.MAITRI || {};
  const bharatiTelemetry = liveData.BHARATI || {};
  const hasAlert = (telemetry, level) => Object.values(telemetry).some((value) => value && typeof value === 'object' && value.alert_level === level);

  const maitri = useMemo(() => {
    const critical = hasAlert(maitriTelemetry, 'critical');
    const warning = hasAlert(maitriTelemetry, 'warning');
    return {
      id: 'MAITRI', name: 'Maitri', temp: Number(maitriWeather.temp ?? maitriTelemetry.outdoor_temp ?? -17.7).toFixed(0),
      wind: maitriWeather.windKmh ?? 42, health: critical ? 38 : warning ? 76 : 92,
      status: critical ? 'DOWN' : warning ? 'WARNING' : 'ACTIVE'
    };
  }, [maitriWeather.temp, maitriWeather.windKmh, maitriTelemetry]);

  const bharati = useMemo(() => {
    const critical = hasAlert(bharatiTelemetry, 'critical');
    const warning = hasAlert(bharatiTelemetry, 'warning');
    return {
      id: 'BHARATI', name: 'Bharati', temp: Number(bharatiWeather.temp ?? bharatiTelemetry.outdoor_temp ?? -14.3).toFixed(0),
      wind: bharatiWeather.windKmh ?? 22, health: critical ? 41 : warning ? 74 : 96,
      status: critical ? 'DOWN' : warning ? 'WARNING' : 'NORMAL'
    };
  }, [bharatiWeather.temp, bharatiWeather.windKmh, bharatiTelemetry]);

  const averageTemp = Math.round((Number(maitri.temp) + Number(bharati.temp)) / 2);
  const averageWind = Math.round((Number(maitri.wind) + Number(bharati.wind)) / 2);
  const averageHealth = Math.round((maitri.health + bharati.health) / 2);

  return (
    <section className="relative h-full w-full select-none overflow-hidden bg-transparent text-white">
      <InteractiveGlobe onStationSelect={onStationSelect} stationMetrics={{ MAITRI: maitri, BHARATI: bharati }} />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_61%_50%,transparent_28%,rgba(5,11,20,0.18)_62%,rgba(5,11,20,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[44%] bg-gradient-to-r from-[#050b14]/55 via-[#050b14]/22 to-transparent" />

      <div className="relative z-20 flex h-full w-[400px] flex-col px-10 pb-8 pt-11 lg:w-[430px] lg:px-12">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300"><Activity size={13} /> Southern Ocean Network</div>
          <h1 className="font-serif text-[53px] leading-[0.96] tracking-tight text-white lg:text-[59px]">Antarctica,<br /><span className="italic text-sky-300">Connected.</span></h1>
          <p className="mt-4 max-w-[290px] text-[15px] leading-relaxed text-sky-100/85">Operational intelligence for remote Antarctic research stations.</p>
        </motion.div>

        <div className="my-auto space-y-4 py-7">
          <StationCard station={maitri} metrics={maitri} accent="rose" onClick={() => onStationSelect('MAITRI')} onHover={setHoveredStation} />
          <StationCard station={bharati} metrics={bharati} accent="emerald" onClick={() => onStationSelect('BHARATI')} onHover={setHoveredStation} />
          {hoveredStation && <span className="ml-1 font-mono text-[10px] tracking-wide text-sky-300">OPEN {hoveredStation} DIGITAL TWIN <ArrowUpRight className="inline" size={12} /></span>}
        </div>

        <div className="rounded-xl border border-sky-800/70 bg-[#061422]/65 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200"><Cloud size={15} /> Antarctic overall <span className="text-sky-400">regional weather</span></div>
          <div className="grid grid-cols-3 divide-x divide-sky-900/70">
            <div className="pl-1"><div className="font-mono text-[9px] text-slate-500">AVG. TEMP.</div><div className="mt-1 font-mono text-base font-bold text-slate-100">{averageTemp}°C</div></div>
            <div className="pl-4"><div className="font-mono text-[9px] text-slate-500">AVG. WIND.</div><div className="mt-1 font-mono text-base font-bold text-slate-100">{averageWind} km/h</div></div>
            <div className="pl-4"><div className="font-mono text-[9px] text-slate-500">REGIONAL HEALTH</div><div className="mt-1 font-mono text-base font-bold text-emerald-300">{averageHealth}% <span className="rounded bg-emerald-400/10 px-1 text-[8px]">NORMAL</span></div></div>
          </div>
        </div>
      </div>

      <TwinStationsPanel maitri={maitri} bharati={bharati} />
      <div className="pointer-events-none absolute bottom-7 right-7 z-20 hidden h-20 w-20 items-center justify-center rounded-full border border-sky-300/80 text-sky-200 shadow-[0_0_26px_rgba(56,189,248,0.22)] md:flex">
        <Compass size={32} fill="currentColor" strokeWidth={1} /><span className="absolute -top-5 font-mono text-[10px]">N</span><span className="absolute -bottom-5 font-mono text-[10px]">S</span><span className="absolute -left-5 font-mono text-[10px]">W</span><span className="absolute -right-5 font-mono text-[10px]">E</span>
      </div>
      <div className="pointer-events-none absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-sky-800/70 bg-[#071521]/70 px-4 py-1.5 font-mono text-[10px] tracking-wider text-sky-200/80 backdrop-blur-md md:flex"><ServerCog size={13} /> LIVE GLOBE · SCROLL TO EXPLORE</div>
    </section>
  );
}
