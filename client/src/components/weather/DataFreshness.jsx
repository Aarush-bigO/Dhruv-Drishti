import React from 'react';
import { Activity, Clock, ShieldCheck, Database, Radio } from 'lucide-react';

export default function DataFreshness({ freshness, qualityStatus = 'VALID', observedAt, onSyncLive }) {
  const [syncing, setSyncing] = React.useState(false);
  const status = freshness?.status || 'LIVE';
  const sourceName = freshness?.source_name || 'NPDC AWS Live Server';

  const handleSync = async () => {
    if (!onSyncLive || syncing) return;
    setSyncing(true);
    try {
      await onSyncLive();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        );
      case 'DELAYED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            DELAYED
          </div>
        );
      case 'STALE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            STALE
          </div>
        );
      case 'REPLAY':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
            HISTORICAL REPLAY
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            OFFLINE
          </div>
        );
    }
  };

  const formatObsTime = () => {
    if (!observedAt) return '--';
    try {
      const dt = new Date(observedAt);
      return dt.toUTCString().replace('GMT', 'UTC');
    } catch {
      return observedAt;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-lg">
      
      {/* Left: Source & Status Badge */}
      <div className="flex items-center gap-2.5">
        {getStatusBadge()}
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
          <Database size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />
          <span className="truncate">{sourceName}</span>
        </div>
      </div>

      {/* Right: Observational Metadata & Sync Button */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
        
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{formatObsTime()}</span>
        </div>

        <div className="flex items-center gap-1">
          <ShieldCheck size={13} className={qualityStatus === 'VALID' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'} />
          <span className={`font-semibold ${qualityStatus === 'VALID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {qualityStatus}
          </span>
        </div>

        {onSyncLive && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-[11px]"
          >
            <Activity size={11} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync AWS'}</span>
          </button>
        )}

      </div>

    </div>
  );
}
