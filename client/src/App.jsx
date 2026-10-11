import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useStationData } from './hooks/useStationData';
import { useWeatherData } from './hooks/useWeatherData';
import { STATIONS, API_BASE } from './utils/constants';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';
import Toast from './components/auth/Toast';

import AntarcticaOverview from './components/map/AntarcticaOverview';
import StationLayout from './components/twin2d/StationLayout';
import EquipmentPanel from './components/panels/EquipmentPanel';
import LogisticsPanel from './components/panels/LogisticsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import AlertBanner from './components/panels/AlertBanner';
import WhatIfControls from './components/simulator/WhatIfControls';
import ImpactAnalysis from './components/simulator/ImpactAnalysis';

// NPDC Weather Components
import DataFreshness from './components/weather/DataFreshness';
import WeatherCards from './components/weather/WeatherCards';
import WeatherChart from './components/weather/WeatherChart';
import WindRoseRadar from './components/weather/WindRoseRadar';
import WeatherAnomalyPanel from './components/weather/WeatherAnomalyPanel';
import ReplayControls from './components/weather/ReplayControls';

import { CloudRain, Cpu, Package, ActivitySquare, Compass, Radio, Sun, Moon } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedStation, setSelectedStation] = useState('BHARATI');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [twinRightPanel, setTwinRightPanel] = useState('weather');
  
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

  // Auth modal + pending redirect state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { view, station }
  const [toast, setToast] = useState(null); // { message, type }

  const { latestData, isConnected } = useWebSocket();
  const { fetchHistory, runWhatIf } = useStationData();
  const { 
    latestWeather, 
    history: weatherHistory, 
    freshness, 
    anomalies: weatherAnomalies, 
    replayState, 
    triggerReplay,
    syncLive
  } = useWeatherData(selectedStation);

  // Station Weather state for all stations (with initial baseline value 'v', updated once AWS syncs)
  const [stationWeather, setStationWeather] = useState({
    BHARATI: { temp: -14.3, windKmh: 22, humidity: 72, quality_status: 'VALID' },
    MAITRI: { temp: -17.7, windKmh: 42, humidity: 25, quality_status: 'VALID' }
  });

  const fetchStationWeather = useCallback(async (stn) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/latest/${stn}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.has_data !== false) {
          const temp = data.temperature_c != null ? Number(Number(data.temperature_c).toFixed(1)) : null;
          const windKmh = data.wind_speed_mps != null ? Math.round(data.wind_speed_mps * 3.6) : null;
          setStationWeather(prev => ({
            ...prev,
            [stn]: {
              ...prev[stn],
              temp: temp ?? prev[stn]?.temp,
              windKmh: windKmh ?? prev[stn]?.windKmh,
              humidity: data.relative_humidity_pct ?? prev[stn]?.humidity,
              quality_status: data.quality_status || 'VALID',
              observed_at: data.observed_at
            }
          }));
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch weather for ${stn}:`, e);
    }
  }, []);

  // Auto initial sync on load — updates AWS data without needing manual click
  useEffect(() => {
    fetchStationWeather('BHARATI');
    fetchStationWeather('MAITRI');

    let isCancelled = false;
    const autoInitialSync = async () => {
      try {
        await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/weather/sync/BHARATI`, { method: 'POST' }),
          fetch(`${API_BASE}/api/v1/weather/sync/MAITRI`, { method: 'POST' })
        ]);
        if (!isCancelled) {
          fetchStationWeather('BHARATI');
          fetchStationWeather('MAITRI');
        }
      } catch (e) {
        console.warn('Auto initial weather sync error:', e);
      }
    };
    autoInitialSync();

    return () => { isCancelled = true; };
  }, [fetchStationWeather]);

  // Keep stationWeather updated whenever useWeatherData receives a discrete update
  useEffect(() => {
    if (latestWeather && latestWeather.station_id) {
      const stn = latestWeather.station_id.toUpperCase();
      const temp = latestWeather.temperature_c != null ? Number(Number(latestWeather.temperature_c).toFixed(1)) : null;
      const windKmh = latestWeather.wind_speed_mps != null ? Math.round(latestWeather.wind_speed_mps * 3.6) : null;
      setStationWeather(prev => ({
        ...prev,
        [stn]: {
          ...prev[stn],
          temp: temp ?? prev[stn]?.temp,
          windKmh: windKmh ?? prev[stn]?.windKmh,
          humidity: latestWeather.relative_humidity_pct ?? prev[stn]?.humidity,
          quality_status: latestWeather.quality_status || 'VALID',
          observed_at: latestWeather.observed_at
        }
      }));
    }
  }, [latestWeather]);

  const handleSyncLive = async () => {
    await syncLive();
    fetchStationWeather(selectedStation);
  };
  
  const [historyData, setHistoryData] = useState([]);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const [utcTime, setUtcTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes} UTC`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const allAlerts = [];
  Object.values(latestData).forEach(stationObj => {
    Object.values(stationObj).forEach(eqData => {
      if (eqData && typeof eqData === 'object' && eqData.alert_level && eqData.alert_level !== 'normal') {
        allAlerts.push(eqData);
      }
    });
  });

  // ─── Protected navigation — shows auth modal if not logged in ──────────────
  const handleProtectedNavigate = (view, station = null, panel = null) => {
    if (!isAuthenticated) {
      setPendingAction({ view, station, panel });
      setShowAuthModal(true);
    } else {
      setActiveView(view);
      if (station) setSelectedStation(station);
      setSelectedEquipment(null);
      if (view === 'twin') setTwinRightPanel(panel || 'weather');
    }
  };

  // Called after successful login/signup — consumes pendingAction
  const handleAuthSuccess = (loggedInUser) => {
    setShowAuthModal(false);
    setToast({ message: `Welcome, ${loggedInUser.full_name.split(' ')[0]}! 🧊`, type: 'success' });
    if (pendingAction) {
      setActiveView(pendingAction.view);
      if (pendingAction.station) setSelectedStation(pendingAction.station);
      setSelectedEquipment(null);
      setTwinRightPanel(pendingAction.panel || 'weather');
      setPendingAction(null);
    }
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingAction(null);
  };

  const handleLogout = () => {
    logout();
    setActiveView('overview');
    setToast({ message: 'Signed out. See you next expedition! 🐧', type: 'warning' });
  };

  const handleStationSelect = (stationId) => {
    handleProtectedNavigate('twin', stationId);
  };

  const handleEquipmentSelect = async (eq) => {
    setSelectedEquipment(eq);
    setSelectedRoom(null);
    setTwinRightPanel('equipment');
    const hist = await fetchHistory(selectedStation, 100, eq.id);
    setHistoryData(hist);
  };

  const handleRoomSelect = async (room) => {
    setSelectedRoom(room);
    setSelectedEquipment(null);
    setTwinRightPanel('equipment');
    const hist = await fetchHistory(selectedStation, 300);
    setHistoryData(hist);
  };

  const handleRunSim = async (params) => {
    setSimLoading(true);
    const res = await runWhatIf(params);
    setSimResult(res);
    setSimLoading(false);
  };

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('polar-twin-panel-width');
    return saved ? Math.max(380, Math.min(parseInt(saved, 10), 850)) : 560;
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 380;
      const maxWidth = Math.floor(window.innerWidth * 0.65);
      const clamped = Math.max(minWidth, Math.min(newWidth, maxWidth));
      
      setRightPanelWidth(clamped);
      localStorage.setItem('polar-twin-panel-width', String(clamped));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const currentTemp = stationWeather[selectedStation]?.temp != null
    ? Number(stationWeather[selectedStation].temp).toFixed(1)
    : (latestWeather?.temperature_c != null
        ? Number(latestWeather.temperature_c).toFixed(1)
        : (latestData[selectedStation]?.outdoor_temp != null ? Number(latestData[selectedStation]?.outdoor_temp).toFixed(1) : '--'));

  return (
    <div className={`h-screen w-screen flex flex-col bg-slate-100 dark:bg-[#050b14] overflow-hidden text-slate-800 dark:text-slate-200 font-sans ${activeView === 'overview' ? 'overview-shell' : ''} ${isDragging ? 'select-none cursor-col-resize' : ''}`}>
      
      <AlertBanner alerts={allAlerts} />

      <nav className="h-16 bg-white/95 dark:bg-[#070d18]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shrink-0 flex items-center justify-between px-8 z-40 select-none">
        
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('overview')}>
          <div className="w-8 h-8 flex items-center justify-center text-slate-800 dark:text-white">
            <svg viewBox="0 0 64 64" className="w-7 h-7" fill="currentColor" aria-hidden>
              <path d="M32 6c2 3 6 8 7 14 1 2 4 3 6 2 3-1 7 1 8 5 1 3-1 6-4 7l-3 8c2 2 6 3 7 7 1 4-2 8-6 9-3 9-14 14-23 10-4 1-8-2-8-6 0-3 2-5 4-7-4-2-7-7-6-12 1-4 5-6 8-5 1-6 6-12 10-16z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-wider text-slate-900 dark:text-white uppercase leading-none">
              POLAR TWIN
            </span>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-1">
              ANTARCTIC REMOTE INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <NavItem active={activeView === 'overview'} onClick={() => setActiveView('overview')} label="Overview" />
          <NavItem active={activeView === 'twin' && twinRightPanel !== 'logistics'} onClick={() => handleProtectedNavigate('twin', null, 'weather')} label="Stations" />
          <NavItem active={activeView === 'whatif'} onClick={() => handleProtectedNavigate('whatif')} label="Research & What-If" />
          <NavItem active={activeView === 'twin' && twinRightPanel === 'logistics'} onClick={() => handleProtectedNavigate('twin', null, 'logistics')} label="Logistics" />
        </div>

        <div className="flex items-center gap-4">
          {activeView === 'twin' && (
            <select
              value={selectedStation}
              onChange={(e) => { setSelectedStation(e.target.value); setSelectedEquipment(null); }}
              className="bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1 text-xs font-mono font-semibold outline-none focus:border-sky-400 cursor-pointer"
            >
              {Object.keys(STATIONS).map(id => (
                <option key={id} value={id}>{STATIONS[id].name}</option>
              ))}
            </select>
          )}

          {activeView === 'twin' && (
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">AWS Temp</div>
              <div className="font-mono font-bold text-sky-400 text-xs">{currentTemp} °C</div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
          </button>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`} />
            <span className="text-slate-600 dark:text-slate-300 font-medium tracking-wide">
              {isConnected ? `SATELLITE LINK ${utcTime}` : 'CONNECTING SATELLITE...'}
            </span>
          </div>

          {/* ── Auth UI ── */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/60 border border-sky-800/50 rounded-lg">
                <span className="text-[10px] font-mono text-sky-400">🔬</span>
                <span className="text-[11px] font-mono font-semibold text-sky-300 max-w-[120px] truncate">
                  {user.full_name}
                </span>
                {user.institution && (
                  <span className="text-[10px] font-mono text-sky-600 hidden lg:block">
                    ({user.institution})
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-700 hover:border-red-800 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold text-sky-400 border border-sky-700/60 hover:bg-sky-950/50 hover:border-sky-500 transition-colors"
            >
              🔬 Researcher Login
            </button>
          )}
        </div>
      </nav>

      {/* ── Auth Modal ── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Toast Notification ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <main className="flex-1 relative flex overflow-hidden">
        
        {activeView === 'overview' && (
          <AntarcticaOverview 
            onStationSelect={handleStationSelect} 
            liveData={latestData}
            stationWeather={stationWeather}
          />
        )}

        {activeView === 'twin' && (
          <div className="flex w-full h-full">
            {/* Left 2D Digital Twin Blueprint Canvas */}
            <div className="flex-1 h-full min-w-0 relative overflow-hidden">
              <StationLayout 
                stationId={selectedStation} 
                liveData={latestData}
                onEquipmentClick={handleEquipmentSelect}
                onRoomClick={handleRoomSelect}
                selectedEquipment={selectedEquipment}
                selectedRoom={selectedRoom}
              />
            </div>
            
            {/* LeetCode Style Draggable Splitter Divider */}
            <div 
              onMouseDown={handleMouseDown}
              className={`w-2 shrink-0 h-full relative cursor-col-resize transition-all z-20 group flex items-center justify-center select-none ${
                isDragging 
                  ? 'bg-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]' 
                  : 'bg-slate-200 dark:bg-slate-800/80 hover:bg-sky-400 dark:hover:bg-sky-500 hover:shadow-[0_0_8px_rgba(56,189,248,0.5)]'
              }`}
              title="Drag to resize blueprint & panel"
            >
              {/* Center Grab Handle Indicator */}
              <div className={`w-1 h-8 rounded-full transition-colors ${
                isDragging 
                  ? 'bg-white' 
                  : 'bg-slate-400 dark:bg-slate-600 group-hover:bg-white'
              }`} />
            </div>

            {/* Right Drawer Panel */}
            <div 
              style={{ width: `${rightPanelWidth}px` }}
              className="shrink-0 h-full relative z-10 shadow-2xl flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800"
            >
              <div className="flex bg-slate-50 dark:bg-[#070d18] border-b border-slate-200 dark:border-slate-800 h-12 shrink-0 select-none">
                <button 
                  className={`flex-1 font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${twinRightPanel === 'weather' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border-b-2 border-sky-500 dark:border-sky-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  onClick={() => setTwinRightPanel('weather')}
                >
                  <CloudRain size={14} />
                  <span>NPDC Weather AWS</span>
                </button>

                <button 
                  className={`flex-1 font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border-l border-slate-200 dark:border-slate-800 ${twinRightPanel === 'equipment' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 dark:border-amber-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  onClick={() => setTwinRightPanel('equipment')}
                >
                  <Cpu size={14} />
                  <span>Equipment Telemetry</span>
                </button>

                <button 
                  className={`flex-1 font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border-l border-slate-200 dark:border-slate-800 ${twinRightPanel === 'logistics' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 dark:border-emerald-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  onClick={() => setTwinRightPanel('logistics')}
                >
                  <Package size={14} />
                  <span>Logistics</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {twinRightPanel === 'weather' && (
                  <div className="space-y-5">
                    <DataFreshness freshness={freshness} qualityStatus={latestWeather?.quality_status || 'VALID'} observedAt={latestWeather?.observed_at} onSyncLive={handleSyncLive} />
                    <ReplayControls onTriggerReplay={triggerReplay} replayState={replayState} />
                    <WeatherCards observation={latestWeather} history={weatherHistory} />
                    <WeatherChart observations={weatherHistory} stationId={selectedStation} />
                    <WindRoseRadar observations={weatherHistory} />
                    <WeatherAnomalyPanel anomalies={weatherAnomalies} latestWeather={latestWeather} />
                  </div>
                )}

                {twinRightPanel === 'equipment' && (
                  <ErrorBoundary>
                    <EquipmentPanel 
                      equipment={selectedEquipment} 
                      selectedRoom={selectedRoom}
                      stationId={selectedStation} 
                      liveData={latestData} 
                      history={historyData} 
                      onSelectEquipment={handleEquipmentSelect} 
                      onClose={() => { setSelectedEquipment(null); setSelectedRoom(null); }} 
                    />
                  </ErrorBoundary>
                )}

                {twinRightPanel === 'logistics' && (
                  <LogisticsPanel stationId={selectedStation} latestTelemetry={latestData} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'whatif' && (
          <div className="w-full h-full bg-slate-100 dark:bg-[#050b14] p-6 flex gap-6 overflow-hidden">
            <div className="w-1/3 min-w-[350px] shrink-0">
              <WhatIfControls onRunSimulation={handleRunSim} loading={simLoading} />
            </div>
            <div className="flex-1 min-w-0">
              <ImpactAnalysis result={simResult} loading={simLoading} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function NavItem({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-1 text-sm font-medium transition-all tracking-wide
        ${active ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
    >
      {label}
      {active && (
        <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-slate-900 dark:bg-white rounded-full" />
      )}
    </button>
  );
}

export default App;
