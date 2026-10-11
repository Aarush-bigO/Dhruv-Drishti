import React, { useState } from 'react';
import { STATIONS } from '../../utils/constants';
import RoomZone from './RoomZone';
import EquipmentNode from './EquipmentNode';
import HeatmapLayer from './HeatmapLayer';
import { Layers, Zap, Flame, Compass } from 'lucide-react';

export default function StationLayout({ 
  stationId, 
  liveData, 
  onEquipmentClick, 
  onRoomClick, 
  selectedEquipment, 
  selectedRoom 
}) {
  const station = STATIONS[stationId];
  const stationLiveData = liveData[stationId] || {};
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [activeLayers, setActiveLayers] = useState({
    grid: true,
    thermal: true,
    powerLines: true
  });

  if (!station) return <div className="text-slate-400 p-8">Station configuration not found</div>;

  const handleEqClick = (eq) => {
    if (onEquipmentClick) onEquipmentClick(eq);
  };

  const handleRoomClick = (room) => {
    if (onRoomClick) onRoomClick(room);
  };

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-slate-100 dark:bg-[#050b14] p-3 pt-2 pb-1 overflow-hidden relative select-none">
      
      {/* Blueprint Layer Control Header */}
      <div className="w-full max-w-7xl flex items-center justify-between pb-2 mb-1 border-b border-slate-200 dark:border-slate-800/80 z-10 shrink-0">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            2D Digital Twin Schematic — {station.name}
          </div>
          <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
            <span>{station.name.toUpperCase()} SYSTEM BLUEPRINT</span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              Est. {station.established}
            </span>
          </h2>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <button
            onClick={() => toggleLayer('thermal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${activeLayers.thermal ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Flame size={12} />
            <span>Thermal</span>
          </button>

          <button
            onClick={() => toggleLayer('powerLines')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${activeLayers.powerLines ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Zap size={12} />
            <span>Power Grid</span>
          </button>
        </div>
      </div>

      {/* SVG Blueprint Canvas */}
      <div className="relative w-full flex-1 min-h-0 max-w-7xl flex items-center justify-center p-1">
        <svg 
          viewBox="14 14 472 422" 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-[88vh]"
          style={{ filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.8))' }}
        >
          <title>{station.name} Digital Twin Blueprint</title>
          
          {/* Blueprint Grid Pattern */}
          <defs>
            <pattern id="station-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f172a" strokeWidth="0.8"/>
            </pattern>

            <linearGradient id="power-conduit" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#station-grid)" />
          
          {/* Outer Cybernetic Enclosure */}
          <rect 
            x="20" y="20" width="460" height="410" 
            fill="#080f1e" 
            fillOpacity="0.75"
            stroke="#1e293b" 
            strokeWidth="1.5" 
            rx="8" 
          />

          {/* Corner Tech Brackets */}
          <path d="M 20 45 L 20 20 L 45 20" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 455 20 L 480 20 L 480 45" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 20 405 L 20 430 L 45 430" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M 455 430 L 480 430 L 480 405" fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Thermal Heatmap Layer */}
          {activeLayers.thermal && (
            <HeatmapLayer rooms={station.rooms} liveData={stationLiveData} />
          )}

          {/* Active Power Grid & Thermal Trace Conduits */}
          {activeLayers.powerLines && (
            <g opacity="0.65">
              {/* Gen Room to Battery & Living Quarters */}
              <path 
                d="M 160 170 L 160 180 L 255 180 L 255 190 M 160 180 L 190 180 L 190 310" 
                fill="none" 
                stroke="url(#power-conduit)" 
                strokeWidth="2" 
                strokeDasharray="4 3" 
                className="animate-pulse"
              />
              {/* Gen Room to Fuel Storage */}
              <path 
                d="M 210 115 L 230 115" 
                fill="none" 
                stroke="#f59e0b" 
                strokeWidth="2" 
                strokeDasharray="3 3" 
              />
              {/* Battery to Life Support & Comms */}
              <path 
                d="M 310 240 L 330 240 M 255 290 L 255 300 L 280 300 L 280 365 L 290 365" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />
            </g>
          )}

          {/* Room Zones */}
          {station.rooms.map(room => {
            let maxAlertLevel = 'normal';
            if (room.equipment) {
              room.equipment.forEach(eq => {
                const eqData = stationLiveData[eq.id];
                if (eqData?.alert_level === 'critical') maxAlertLevel = 'critical';
                else if (eqData?.alert_level === 'warning' && maxAlertLevel !== 'critical') maxAlertLevel = 'warning';
              });
            }
            
            const isRoomSelected = selectedRoom?.id === room.id && !selectedEquipment;

            return (
              <RoomZone 
                key={room.id}
                room={room}
                alertLevel={maxAlertLevel}
                isHovered={hoveredRoom === room.id}
                isSelected={isRoomSelected}
                onClick={() => handleRoomClick(room)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
              />
            );
          })}

          {/* Equipment Nodes */}
          {station.rooms.map(room => (
            room.equipment?.map(eq => {
              const eqData = stationLiveData[eq.id];
              return (
                <EquipmentNode 
                  key={eq.id}
                  equipment={eq}
                  alertLevel={eqData?.alert_level || 'normal'}
                  isSelected={selectedEquipment?.id === eq.id}
                  onClick={() => handleEqClick(eq)}
                />
              );
            })
          ))}
        </svg>
      </div>
    </div>
  );
}
