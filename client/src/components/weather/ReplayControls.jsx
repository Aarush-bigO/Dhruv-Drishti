import React, { useState } from 'react';
import { Play, Square, Radio } from 'lucide-react';

export default function ReplayControls({ onTriggerReplay, replayState }) {
  const [selectedSpeed, setSelectedSpeed] = useState(5.0);
  const isRunning = replayState?.is_running;

  const handleToggle = () => {
    if (isRunning) {
      onTriggerReplay('stop', selectedSpeed);
    } else {
      onTriggerReplay('start', selectedSpeed);
    }
  };

  const handleSpeedChange = (speed) => {
    setSelectedSpeed(speed);
    if (isRunning) {
      onTriggerReplay('start', speed);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl select-none">
      
      {/* Title & Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
          <Radio size={16} className={isRunning ? 'animate-pulse' : ''} />
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Historical Storm Replay</span>
            {isRunning && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 animate-pulse">
                STREAMING ({selectedSpeed}x)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Streams real 1-minute resolution cyclone records from NCPOR archive directly through the live ML pipeline.
          </p>
        </div>
      </div>

      {/* Play / Speed Controls */}
      <div className="flex items-center gap-3">
        {/* Speed Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
          {[1, 2, 5, 10, 20].map(s => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${selectedSpeed === s ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Start / Stop Button */}
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all shadow-md cursor-pointer
            ${isRunning 
              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/30' 
              : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-cyan-500/20'}`}
        >
          {isRunning ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          <span>{isRunning ? 'STOP REPLAY' : 'REPLAY STORM'}</span>
        </button>
      </div>

    </div>
  );
}
