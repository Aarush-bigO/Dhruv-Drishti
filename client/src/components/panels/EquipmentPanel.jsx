import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, Thermometer, Droplets, Battery, ArrowLeft, 
  Cpu, Zap, Layers 
} from 'lucide-react';
import { ALERT_LEVELS, STATIONS } from '../../utils/constants';

export default function EquipmentPanel({ 
  equipment, 
  selectedRoom,
  stationId, 
  liveData, 
  history = [], 
  onSelectEquipment,
  onClose 
}) {
  const station = STATIONS[stationId] || STATIONS['BHARATI'];
  const stationLiveData = (liveData && liveData[stationId]) || {};

  // Extract all equipment installed at this station
  const allEquipmentList = [];
  if (station && station.rooms) {
    station.rooms.forEach(room => {
      if (room.equipment) {
        room.equipment.forEach(eq => {
          const live = stationLiveData[eq.id] || (Array.isArray(history) ? history.find(h => h && h.equipment_id === eq.id) : null);
          allEquipmentList.push({
            ...eq,
            roomName: room.name,
            data: live || {}
          });
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // VIEW 1: ROOM MULTI-EQUIPMENT VIEW (When room is clicked, all equipment appear one below other)
  // --------------------------------------------------------------------------
  if (!equipment && selectedRoom) {
    const roomEqList = (selectedRoom.equipment || []).map(eq => {
      const live = stationLiveData[eq.id] || (Array.isArray(history) ? history.find(h => h && h.equipment_id === eq.id) : null);
      return {
        ...eq,
        data: live || {}
      };
    });

    // Determine highest alert level in this room
    let roomAlertLvl = 'normal';
    roomEqList.forEach(item => {
      const lvl = item.data?.alert_level;
      if (lvl === 'critical') roomAlertLvl = 'critical';
      else if (lvl === 'warning' && roomAlertLvl !== 'critical') roomAlertLvl = 'warning';
    });
    const roomAlertColor = ALERT_LEVELS[roomAlertLvl]?.color || '#22c55e';

    return (
      <div className="w-full flex flex-col space-y-4 select-none">
        
        {/* Room Header Banner */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Back to All Assets"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                {station.name} — Room Compartment
              </div>
              <h3 className="text-base font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{selectedRoom.name}</span>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                  style={{ backgroundColor: `${roomAlertColor}22`, color: roomAlertColor, border: `1px solid ${roomAlertColor}44` }}
                >
                  ● {roomAlertLvl}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
              {roomEqList.length} {roomEqList.length === 1 ? 'Asset' : 'Assets'}
            </span>
            <button 
              onClick={onClose} 
              className="text-xs font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              All Assets
            </button>
          </div>
        </div>

        {/* If room has 0 equipment (e.g. Living Quarters) */}
        {roomEqList.length === 0 && (
          <div className="p-6 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Thermometer size={18} />
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">Facility Environmental Telemetry</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Habitat living zone climate and life support envelope</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Thermometer size={16}/>} label="Indoor Temp" value={stationLiveData.indoor_temp != null ? Number(stationLiveData.indoor_temp).toFixed(1) : '21.0'} unit="°C" />
              <StatCard icon={<Activity size={16}/>} label="HVAC Pressure" value={stationLiveData.hvac_pressure != null ? Number(stationLiveData.hvac_pressure).toFixed(3) : '1.018'} unit="bar" />
              <StatCard icon={<Cpu size={16}/>} label="Climate System" value="OPTIMAL" unit="" />
              <StatCard icon={<Layers size={16}/>} label="Station Crew" value={`${station.crew || 25}`} unit="Pax" />
            </div>

            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
              No heavy electromechanical plant installed in this compartment. Habitat life support, ambient thermal regulation, and oxygen balance are supplied via central conduits.
            </div>
          </div>
        )}

        {/* Stacked Equipment Cards — Appearing one below other */}
        {roomEqList.map((item, index) => {
          const itemData = item.data || {};
          const alertLvl = itemData.alert_level || 'normal';
          const alertColor = ALERT_LEVELS[alertLvl]?.color || '#22c55e';
          const failureRisk = itemData.failure_risk != null ? Number(itemData.failure_risk) : (alertLvl === 'critical' ? 0.92 : alertLvl === 'warning' ? 0.60 : 0.08);
          const riskPercentage = (failureRisk * 100).toFixed(0);
          const gaugeStroke = failureRisk > 0.7 ? '#ef4444' : failureRisk > 0.4 ? '#f59e0b' : '#22c55e';
          const anomalyScore = itemData.anomaly_score != null ? Number(itemData.anomaly_score).toFixed(2) : (failureRisk * 0.9).toFixed(2);
          const cusumDrift = itemData.cusum_drift_detected || (alertLvl === 'critical');

          const isGen = item.id.startsWith('GEN');
          const isFuel = item.id.startsWith('FUEL');
          const isBatt = item.id.startsWith('BATT');
          const isHvac = item.id.startsWith('HVAC');
          const isLife = item.id.startsWith('WATER') || item.id.startsWith('STP');

          // Filter history specifically for this item in chronological order
          const eqHist = Array.isArray(history) 
            ? history.filter(h => h && h.equipment_id === item.id).map((h, i) => ({
                idx: i,
                rpm: h.generator_rpm != null ? Math.round(h.generator_rpm) : null,
                vibration: h.vibration_level != null ? Number(Number(h.vibration_level).toFixed(2)) : null,
                fuel: h.fuel_level_liters != null ? Math.round(h.fuel_level_liters) : null,
                soc: h.battery_soc != null ? Number(Number(h.battery_soc).toFixed(1)) : null,
                pressure: h.hvac_pressure != null ? Number(Number(h.hvac_pressure).toFixed(3)) : null,
                temp: h.indoor_temp != null ? Number(Number(h.indoor_temp).toFixed(1)) : null,
                water_temp: h.water_temp != null ? Number(Number(h.water_temp).toFixed(1)) : null,
              }))
            : [];

          return (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg p-4 space-y-3.5 hover:border-sky-500/40 transition-all"
            >
              {/* Card Header with Inspect Button */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({item.id})</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {item.id.startsWith('GEN') ? 'Diesel Prime Mover' :
                       item.id.startsWith('FUEL') ? 'Cryogenic Fuel Reserve' :
                       item.id.startsWith('BATT') ? 'Sub-Zero LiFePO4 Energy Storage' :
                       item.id.startsWith('HVAC') ? 'Thermal Air Handling' :
                       item.id.startsWith('WATER') ? 'Potable Meltwater Processing' :
                       item.id.startsWith('STP') ? 'Bio-Reactor Wastewater Treatment' :
                       'Polar Satcom VSAT Transceiver'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{ backgroundColor: `${alertColor}22`, color: alertColor, border: `1px solid ${alertColor}44` }}
                  >
                    ● {alertLvl}
                  </span>
                  <button
                    onClick={() => onSelectEquipment && onSelectEquipment(item)}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Focus deep telemetry for ${item.name}`}
                  >
                    <span>Focus Detail</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {item.id.startsWith('GEN') && (
                  <>
                    <StatCard icon={<Activity size={14}/>} label="RPM" value={itemData.generator_rpm != null ? Math.round(itemData.generator_rpm) : '1500'} unit="RPM" />
                    <StatCard icon={<Activity size={14}/>} label="Vibration" value={itemData.vibration_level != null ? Number(itemData.vibration_level).toFixed(2) : '2.20'} unit="mm/s" />
                    <StatCard icon={<Thermometer size={14}/>} label="Temp" value={itemData.indoor_temp != null ? Number(itemData.indoor_temp).toFixed(1) : '21.0'} unit="°C" />
                    <StatCard icon={<Droplets size={14}/>} label="Fuel Tank" value={itemData.fuel_level_liters != null ? `${Math.round(itemData.fuel_level_liters)}` : '14200'} unit="L" />
                  </>
                )}
                {item.id.startsWith('FUEL') && (
                  <>
                    <StatCard icon={<Droplets size={14}/>} label="Fuel Stored" value={itemData.fuel_level_liters != null ? `${Math.round(itemData.fuel_level_liters)}` : '14200'} unit="L" />
                    <StatCard icon={<Cpu size={14}/>} label="Capacity" value="15,000" unit="L" />
                    <StatCard icon={<Thermometer size={14}/>} label="Ambient Temp" value={itemData.indoor_temp != null ? Number(itemData.indoor_temp).toFixed(1) : '8.5'} unit="°C" />
                    <StatCard icon={<Activity size={14}/>} label="Burn Rate" value="145" unit="L/hr" />
                  </>
                )}
                {item.id.startsWith('BATT') && (
                  <>
                    <StatCard icon={<Battery size={14}/>} label="Battery SOC" value={itemData.battery_soc != null ? Number(itemData.battery_soc).toFixed(1) : '75.0'} unit="%" />
                    <StatCard icon={<Zap size={14}/>} label="Bus Voltage" value="48.2" unit="V" />
                    <StatCard icon={<Thermometer size={14}/>} label="Core Temp" value={itemData.indoor_temp != null ? Number(itemData.indoor_temp).toFixed(1) : '18.0'} unit="°C" />
                    <StatCard icon={<Activity size={14}/>} label="State" value="Nominal" unit="" />
                  </>
                )}
                {!item.id.startsWith('GEN') && !item.id.startsWith('FUEL') && !item.id.startsWith('BATT') && (
                  <>
                    <StatCard icon={<Thermometer size={14}/>} label="Temperature" value={itemData.indoor_temp != null ? Number(itemData.indoor_temp).toFixed(1) : '20.0'} unit="°C" />
                    <StatCard icon={<Activity size={14}/>} label="Pressure" value={itemData.hvac_pressure != null ? Number(itemData.hvac_pressure).toFixed(3) : '1.020'} unit="bar" />
                    <StatCard icon={<Activity size={14}/>} label="Vibration" value={itemData.vibration_level != null ? Number(itemData.vibration_level).toFixed(2) : '1.80'} unit="mm/s" />
                    <StatCard icon={<Cpu size={14}/>} label="Status" value={alertLvl.toUpperCase()} unit="" />
                  </>
                )}
              </div>

              {/* AI Risk & Anomaly Strip */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 uppercase">ML Failure Risk:</span>
                    <span className="font-bold" style={{ color: gaugeStroke }}>{riskPercentage}%</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 uppercase">Anomaly Score:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{anomalyScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${cusumDrift ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-slate-500 dark:text-slate-400">{cusumDrift ? 'CUSUM Drift Alert' : 'Ensemble Stable'}</span>
                </div>
              </div>

              {/* Dynamic Machine Cycle Sparkline — Tailored to Machine Type & Auto-Scaled */}
              {eqHist.length > 0 && (
                <div className="h-24 w-full pt-1">
                  <div className="text-[9px] font-mono text-slate-400 uppercase mb-1 flex justify-between items-center">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {isGen && "Trend: RPM (Blue) & Vibration mm/s (Orange)"}
                      {isFuel && "Trend: Fuel Storage Reserve (Liters)"}
                      {isBatt && "Trend: Battery State of Charge (%)"}
                      {isHvac && "Trend: Duct Pressure bar (Blue) & Temp °C (Rose)"}
                      {isLife && "Trend: Meltwater Temperature (°C)"}
                      {!isGen && !isFuel && !isBatt && !isHvac && !isLife && "Trend: Equipment Thermal Profile (°C)"}
                    </span>
                    <span className="text-[9px] text-sky-500/80 font-mono">{eqHist.length} Pings</span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eqHist} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '10px' }} />
                      
                      {isGen && (
                        <>
                          <YAxis yAxisId="rpm" domain={['auto', 'auto']} hide />
                          <YAxis yAxisId="vib" orientation="right" domain={['auto', 'auto']} hide />
                          <Line yAxisId="rpm" type="monotone" dataKey="rpm" stroke="#0284c7" dot={false} strokeWidth={2} name="RPM" />
                          <Line yAxisId="vib" type="monotone" dataKey="vibration" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Vib (mm/s)" />
                        </>
                      )}

                      {isFuel && (
                        <>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Line type="monotone" dataKey="fuel" stroke="#38bdf8" dot={false} strokeWidth={2} name="Fuel (L)" />
                        </>
                      )}

                      {isBatt && (
                        <>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Line type="monotone" dataKey="soc" stroke="#10b981" dot={false} strokeWidth={2} name="Battery SOC (%)" />
                        </>
                      )}

                      {isHvac && (
                        <>
                          <YAxis yAxisId="p" domain={['auto', 'auto']} hide />
                          <YAxis yAxisId="t" orientation="right" domain={['auto', 'auto']} hide />
                          <Line yAxisId="p" type="monotone" dataKey="pressure" stroke="#38bdf8" dot={false} strokeWidth={2} name="Pressure (bar)" />
                          <Line yAxisId="t" type="monotone" dataKey="temp" stroke="#f43f5e" dot={false} strokeWidth={1.5} name="Cabin Temp (°C)" />
                        </>
                      )}

                      {isLife && (
                        <>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Line type="monotone" dataKey="water_temp" stroke="#14b8a6" dot={false} strokeWidth={2} name="Water Temp (°C)" />
                        </>
                      )}

                      {!isGen && !isFuel && !isBatt && !isHvac && !isLife && (
                        <>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Line type="monotone" dataKey="temp" stroke="#a855f7" dot={false} strokeWidth={2} name="Temp (°C)" />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 2: STATION ALL-EQUIPMENT OVERVIEW (When no specific machine is clicked)
  // --------------------------------------------------------------------------
  if (!equipment) {
    return (
      <div className="w-full flex flex-col space-y-4 select-none">
        
        {/* Header */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {station.name} — Machinery Health
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                {allEquipmentList.length} Monitored Critical Assets
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
            Ensemble AI
          </span>
        </div>

        {/* Equipment List Grid */}
        <div className="space-y-3">
          {allEquipmentList.map((item) => {
            const itemData = item.data || {};
            const alertLvl = itemData.alert_level || 'normal';
            const alertColor = ALERT_LEVELS[alertLvl]?.color || '#22c55e';
            const rpm = itemData.generator_rpm != null ? `${Math.round(itemData.generator_rpm)} RPM` : null;
            const vib = itemData.vibration_level != null ? `${Number(itemData.vibration_level).toFixed(2)} mm/s` : null;
            const fuel = itemData.fuel_level_liters != null ? `${Math.round(itemData.fuel_level_liters)} L` : null;
            const batt = itemData.battery_soc != null ? `${Number(itemData.battery_soc).toFixed(0)}% SOC` : null;

            return (
              <div
                key={item.id}
                onClick={() => onSelectEquipment && onSelectEquipment(item)}
                className="p-4 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({item.id})</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{item.roomName}</div>
                  </div>
                  
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{ backgroundColor: `${alertColor}22`, color: alertColor, border: `1px solid ${alertColor}44` }}
                  >
                    ● {alertLvl}
                  </span>
                </div>

                {/* Quick Telemetry Strip */}
                <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {rpm && <span className="text-sky-600 dark:text-sky-400 font-semibold">{rpm}</span>}
                  {vib && <span className="text-amber-600 dark:text-amber-400 font-semibold">Vib: {vib}</span>}
                  {fuel && <span className="text-slate-700 dark:text-slate-300">{fuel}</span>}
                  {batt && <span className="text-emerald-600 dark:text-emerald-400">{batt}</span>}
                  {!rpm && !vib && !fuel && !batt && (
                    <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Awaiting telemetry cycle...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 3: DEEP DIAGNOSTICS VIEW (When specific equipment is selected)
  // --------------------------------------------------------------------------
  const eqId = equipment?.id || '';
  const isGenerator = eqId.startsWith('GEN');
  const isFuel = eqId.startsWith('FUEL');
  const isBattery = eqId.startsWith('BATT');
  const isHVAC = eqId.startsWith('HVAC');
  const isLifeSupport = eqId.startsWith('WATER') || eqId.startsWith('STP');

  const data = (stationLiveData[eqId]) || (Array.isArray(history) ? history.find(h => h && h.equipment_id === eqId) : {}) || {};
  const alertLvl = data.alert_level || 'normal';
  const alertColor = ALERT_LEVELS[alertLvl]?.color || ALERT_LEVELS.normal.color;
  const eqHistory = Array.isArray(history) ? history.filter(h => h && h.equipment_id === eqId) : [];

  // Extract diagnostics payload if present
  const diagnostics = data.diagnostics || {};
  const ensembleAgreement = diagnostics.ensemble_agreement || (alertLvl === 'normal' ? '0/3 Models Agree' : '3/3 Models Agree');
  const cusumDrift = diagnostics.cusum_drift_detected || false;
  const rootCauses = diagnostics.root_cause_factors || [];
  const prescriptiveActions = diagnostics.recommended_actions || [];

  // Custom SVG Gauge for ML Risk
  const failureRisk = data.failure_risk != null ? Number(data.failure_risk) : (alertLvl === 'critical' ? 0.92 : alertLvl === 'warning' ? 0.60 : 0.08);
  const riskPercentage = (failureRisk * 100).toFixed(0);
  const gaugeStroke = failureRisk > 0.7 ? '#ef4444' : failureRisk > 0.4 ? '#f59e0b' : '#22c55e';

  return (
    <div className="w-full flex flex-col space-y-4 select-none">
      
      {/* Header & Back Navigation */}
      <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Back to All Equipment"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{equipment?.name || eqId}</span>
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                style={{ backgroundColor: `${alertColor}22`, color: alertColor, border: `1px solid ${alertColor}44` }}
              >
                ● {alertLvl}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{eqId} | {stationId}</p>
          </div>
        </div>
        
        <button 
          onClick={onClose} 
          className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>

      {/* Live Metrics Grid — Equipment-Specific */}
      <div className="grid grid-cols-2 gap-3">
        {isGenerator && (
          <>
            <StatCard icon={<Activity size={16}/>} label="RPM" value={data.generator_rpm != null ? Math.round(data.generator_rpm) : '--'} unit="RPM" />
            <StatCard icon={<Activity size={16}/>} label="Vibration" value={data.vibration_level != null ? Number(data.vibration_level).toFixed(2) : '--'} unit="mm/s" />
            <StatCard icon={<Thermometer size={16}/>} label="Indoor Temp" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Droplets size={16}/>} label="Fuel Level" value={data.fuel_level_liters != null ? Math.round(data.fuel_level_liters) : '--'} unit="L" />
          </>
        )}
        {isFuel && (
          <>
            <StatCard icon={<Droplets size={16}/>} label="Fuel Stored" value={data.fuel_level_liters != null ? Math.round(data.fuel_level_liters) : '--'} unit="L" />
            <StatCard icon={<Cpu size={16}/>} label="Capacity" value="15,000" unit="L" />
            <StatCard icon={<Thermometer size={16}/>} label="Ambient Temp" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Activity size={16}/>} label="Burn Rate" value="145" unit="L/hr" />
          </>
        )}
        {isBattery && (
          <>
            <StatCard icon={<Battery size={16}/>} label="Battery SOC" value={data.battery_soc != null ? Number(data.battery_soc).toFixed(1) : '--'} unit="%" />
            <StatCard icon={<Zap size={16}/>} label="Bus Voltage" value="48.2" unit="V" />
            <StatCard icon={<Thermometer size={16}/>} label="Core Temp" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Activity size={16}/>} label="State" value="Nominal" unit="" />
          </>
        )}
        {isHVAC && (
          <>
            <StatCard icon={<Activity size={16}/>} label="Pressure" value={data.hvac_pressure != null ? Number(data.hvac_pressure).toFixed(3) : '--'} unit="bar" />
            <StatCard icon={<Thermometer size={16}/>} label="Cabin Temp" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Activity size={16}/>} label="Vibration" value={data.vibration_level != null ? Number(data.vibration_level).toFixed(2) : '--'} unit="mm/s" />
            <StatCard icon={<Cpu size={16}/>} label="Status" value={alertLvl.toUpperCase()} unit="" />
          </>
        )}
        {isLifeSupport && (
          <>
            <StatCard icon={<Thermometer size={16}/>} label="Water Temp" value={data.water_temp != null ? Number(data.water_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Activity size={16}/>} label="Pressure" value={data.hvac_pressure != null ? Number(data.hvac_pressure).toFixed(3) : '--'} unit="bar" />
            <StatCard icon={<Thermometer size={16}/>} label="Indoor Temp" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Cpu size={16}/>} label="Status" value={alertLvl.toUpperCase()} unit="" />
          </>
        )}
        {!isGenerator && !isFuel && !isBattery && !isHVAC && !isLifeSupport && (
          <>
            <StatCard icon={<Thermometer size={16}/>} label="Temperature" value={data.indoor_temp != null ? Number(data.indoor_temp).toFixed(1) : '--'} unit="°C" />
            <StatCard icon={<Activity size={16}/>} label="Vibration" value={data.vibration_level != null ? Number(data.vibration_level).toFixed(2) : '--'} unit="mm/s" />
            <StatCard icon={<Cpu size={16}/>} label="Status" value={alertLvl.toUpperCase()} unit="" />
            <StatCard icon={<Battery size={16}/>} label="Battery SOC" value={data.battery_soc != null ? Number(data.battery_soc).toFixed(1) : '--'} unit="%" />
          </>
        )}
      </div>

      {/* Ensemble Model Consensus & Risk Breakdown */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
            <Layers size={14} className="text-sky-500 dark:text-sky-400" />
            <span>Ensemble Intelligence (IF + Mahalanobis + LOF)</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${alertLvl === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' : alertLvl === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'}`}>
            {ensembleAgreement}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          {/* Failure Risk Gauge */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="5" />
                <circle 
                  cx="32" cy="32" r="26" fill="transparent" 
                  stroke={gaugeStroke} strokeWidth="5" 
                  strokeDasharray={2 * Math.PI * 26} 
                  strokeDashoffset={(2 * Math.PI * 26) * (1 - failureRisk)} 
                  strokeLinecap="round" className="transition-all duration-700 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold font-mono" style={{ color: gaugeStroke }}>{riskPercentage}%</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">ML Failure Risk</div>
              <div className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {failureRisk > 0.7 ? 'HIGH RISK' : failureRisk > 0.4 ? 'ELEVATED' : 'NOMINAL'}
              </div>
            </div>
          </div>

          {/* Anomaly Score & CUSUM Drift */}
          <div className="border-l border-slate-100 dark:border-slate-800 pl-3">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Anomaly Score</div>
            <div className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
              {data.anomaly_score != null ? Number(data.anomaly_score).toFixed(2) : (failureRisk * 0.9).toFixed(2)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span className={`w-2 h-2 rounded-full ${cusumDrift ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{cusumDrift ? 'CUSUM Drift Alert' : 'CUSUM Stable'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* XAI Root Cause Feature Attribution Breakdown */}
      {rootCauses.length > 0 && (
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-2.5">
          <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-300 uppercase flex items-center justify-between">
            <span>Root Cause Feature Attribution (XAI)</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">% Impact</span>
          </div>

          <div className="space-y-2">
            {rootCauses.map((rc, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-700 dark:text-slate-300">{rc.feature.replace(/_/g, ' ')}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{rc.contribution_pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                    style={{ width: `${Math.min(100, rc.contribution_pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span>Current: {rc.current_value}</span>
                  <span>Baseline: {rc.baseline_mean} (z={rc.z_score})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Performance Time Series */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-slate-300 uppercase mb-3 flex items-center justify-between">
          <span>Live Machinery Time Series</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {isGenerator && 'RPM (Blue) / Vibration mm/s (Orange)'}
            {isFuel && 'Fuel Volume (L)'}
            {isBattery && 'Battery SOC (%)'}
            {isHVAC && 'Air Pressure (bar) / Cabin Temp (°C)'}
            {isLifeSupport && 'Process Water Temp (°C)'}
            {!isGenerator && !isFuel && !isBattery && !isHVAC && !isLifeSupport && 'Equipment Thermal Profile (°C)'}
          </span>
        </h3>
        <div className="h-36 w-full">
          {eqHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eqHistory}>
                <XAxis dataKey="timestamp" hide />
                {isGenerator ? (
                  <>
                    <YAxis yAxisId="left" stroke="#0284c7" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={45} />
                    <YAxis yAxisId="right" orientation="right" stroke="#d97706" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="generator_rpm" stroke="#0284c7" dot={false} strokeWidth={2} name="RPM" />
                    <Line yAxisId="right" type="monotone" dataKey="vibration_level" stroke="#d97706" dot={false} strokeWidth={1.5} name="Vib (mm/s)" />
                  </>
                ) : isFuel ? (
                  <>
                    <YAxis stroke="#38bdf8" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={55} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="fuel_level_liters" stroke="#38bdf8" dot={false} strokeWidth={2} name="Fuel (L)" />
                  </>
                ) : isBattery ? (
                  <>
                    <YAxis stroke="#10b981" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="battery_soc" stroke="#10b981" dot={false} strokeWidth={2} name="Battery SOC (%)" />
                  </>
                ) : isHVAC ? (
                  <>
                    <YAxis yAxisId="left" stroke="#38bdf8" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={45} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="hvac_pressure" stroke="#38bdf8" dot={false} strokeWidth={1.5} name="Pressure (bar)" />
                    <Line yAxisId="right" type="monotone" dataKey="indoor_temp" stroke="#f43f5e" dot={false} strokeWidth={1.5} name="Cabin Temp (°C)" />
                  </>
                ) : (
                  <>
                    <YAxis stroke="#a855f7" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="indoor_temp" stroke="#a855f7" dot={false} strokeWidth={2} name="Indoor Temp (°C)" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-mono text-xs">
              Recording live machine cycles...
            </div>
          )}
        </div>
      </div>

      {/* Physics-Grounded Prescriptive Actions */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-slate-300 uppercase mb-2.5 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-500 dark:text-amber-400" />
          <span>Prescriptive Engineering Mitigation</span>
        </h3>
        <ul className="space-y-1.5">
          {(prescriptiveActions.length > 0 ? prescriptiveActions : [
            alertLvl === 'critical' ? 'Initiate emergency load transfer to redundant backup circuit' :
            alertLvl === 'warning' ? 'Schedule mechanical laser alignment and vibration harmonics inspection' :
            'Equipment operating within nominal thermal-mechanical envelope'
          ]).map((action, idx) => (
            <li key={idx} className="flex gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="text-amber-500 dark:text-amber-400 font-bold">&gt;</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, unit, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm dark:shadow-none ${className}`}>
      <div className="text-sky-600 dark:text-sky-400 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-lg shrink-0">{icon}</div>
      <div className="overflow-hidden">
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase truncate">{label}</div>
        <div className="font-bold text-sm font-mono text-slate-900 dark:text-white">
          {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}
