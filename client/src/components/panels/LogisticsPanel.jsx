import React, { useEffect, useState } from 'react';
import { Package, Droplets, Utensils, Stethoscope, Wrench, RefreshCw, AlertCircle } from 'lucide-react';
import { useStationData } from '../../hooks/useStationData';

export default function LogisticsPanel({ stationId, latestTelemetry }) {
  const { fetchInventory } = useStationData();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory(stationId);
      if (data && !data.detail) {
        setInventory(data);
      } else {
        setError(data?.detail || 'Failed to load inventory data.');
      }
    } catch (err) {
      setError(err?.message || 'Error connecting to station logistics server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchInventory(stationId)
      .then((data) => {
        if (!isMounted) return;
        if (data && !data.detail) {
          setInventory(data);
        } else {
          setError(data?.detail || 'Failed to load inventory data.');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Error connecting to station logistics server.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stationId, fetchInventory]);

  if (loading) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
        <RefreshCw size={20} className="animate-spin text-emerald-500 dark:text-emerald-400" />
        <span>Synchronizing Station Inventory...</span>
      </div>
    );
  }

  if (error || !inventory) {
    return (
      <div className="w-full p-6 flex flex-col items-center justify-center space-y-3 text-center bg-white dark:bg-slate-900/90 rounded-xl border border-red-200 dark:border-red-900/40 shadow-lg">
        <AlertCircle size={24} className="text-red-500 dark:text-red-400" />
        <div className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">
          {error || 'Unable to retrieve inventory data for this station.'}
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-xs cursor-pointer transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Safe baseline fuel & burn rate
  const capacity = Number(inventory.fuel_capacity) || 20000;
  let currentFuel = Number(inventory.fuel_liters) || 14200;
  const burnRate = stationId === 'BHARATI' ? 3480 : 3720; // Approx daily liters

  // Defensively calculate live fuel from telemetry
  const stationData = latestTelemetry?.[stationId];
  if (stationData && typeof stationData === 'object') {
    let totalLiveFuel = 0;
    let hasLiveFuel = false;
    Object.values(stationData).forEach((eq) => {
      if (eq && typeof eq === 'object' && eq.fuel_level_liters != null) {
        const val = Number(eq.fuel_level_liters);
        if (Number.isFinite(val)) {
          totalLiveFuel += val;
          hasLiveFuel = true;
        }
      }
    });
    if (hasLiveFuel && totalLiveFuel > 0) {
      currentFuel = totalLiveFuel;
    }
  }

  const fuelPercent = Math.min(100, Math.max(0, (currentFuel / capacity) * 100));
  const daysUntilFuelDepletion = burnRate > 0 ? currentFuel / burnRate : 0;
  const foodDays = Number(inventory.food_days) || 0;
  const medDays = Number(inventory.medical_supplies_days) || 0;
  const atfLiters = Number(inventory.atf_liters) || 0;
  const sparesCount = Number(inventory.spare_parts_count) || 0;

  return (
    <div className="w-full flex flex-col space-y-4 select-none">
      
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Station Logistics & Inventory
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Last resupply: {inventory.last_resupply || 'N/A'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-semibold">
          Active Stock
        </span>
      </div>

      <div className="space-y-3">
        
        {/* Diesel Fuel Card */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Droplets size={16} />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">Diesel Fuel</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Power & Heating Reserves</span>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {currentFuel.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-500">L</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Cap: {capacity.toLocaleString()} L
              </div>
            </div>
          </div>
          
          <ProgressBar percent={fuelPercent} color={fuelPercent < 20 ? 'bg-red-500' : 'bg-amber-500'} />
          
          <div className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span>Estimated Depletion:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {daysUntilFuelDepletion.toFixed(0)} days <span className="text-[10px] font-normal text-slate-500">(@ {burnRate} L/day)</span>
            </span>
          </div>
        </div>

        {/* Aviation Turbine Fuel (ATF) */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Droplets size={16} />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">Aviation Turbine Fuel (ATF)</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Helicopter & Air Operations</p>
            </div>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
            {atfLiters.toLocaleString()} <span className="text-xs text-slate-500 font-normal">L</span>
          </div>
        </div>

        {/* Provisions Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Food Supply */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
                <Utensils size={14} className="text-emerald-500 dark:text-emerald-400" />
                <span>Food Supply</span>
              </div>
            </div>
            <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white">
              {foodDays} <span className="text-xs font-normal text-slate-500 font-mono">days</span>
            </div>
            <ProgressBar percent={Math.min((foodDays / 365) * 100, 100)} color="bg-emerald-500" />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              Rations for 25 crew
            </div>
          </div>

          {/* Medical Supplies */}
          <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">
                <Stethoscope size={14} className="text-red-500 dark:text-red-400" />
                <span>Med Supplies</span>
              </div>
            </div>
            <div className="text-2xl font-bold font-sans text-slate-900 dark:text-white">
              {medDays} <span className="text-xs font-normal text-slate-500 font-mono">days</span>
            </div>
            <ProgressBar percent={Math.min((medDays / 365) * 100, 100)} color="bg-red-500" />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              Emergency & trauma kits
            </div>
          </div>
        </div>

        {/* Spare Parts */}
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Wrench size={16} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase">Critical Spare Parts</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Generators, HVAC, VSAT modules</div>
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {sparesCount} <span className="text-xs text-slate-500 font-normal">units</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function ProgressBar({ percent, color }) {
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
      <div 
        className={`h-full ${color} transition-all duration-500 ease-out`} 
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}
