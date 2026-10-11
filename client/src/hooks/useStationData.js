import { useState, useCallback } from 'react';
import { API_BASE } from '../utils/constants';

export function useStationData() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/stations/`);
      if (!res.ok) throw new Error('Failed to fetch stations');
      const data = await res.json();
      setStations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async (stationId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stations/inventory/${stationId}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const fetchHistory = useCallback(async (stationId, limit = 300, equipmentId = null) => {
    try {
      const url = equipmentId 
        ? `${API_BASE}/api/v1/telemetry/history/${stationId}?limit=${limit}&equipment_id=${equipmentId}`
        : `${API_BASE}/api/v1/telemetry/history/${stationId}?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch history');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const runWhatIf = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulation/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Failed to run simulation');
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stations, loading, error, fetchStations, fetchInventory, fetchHistory, runWhatIf };
}
