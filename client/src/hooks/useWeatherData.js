import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, WS_URL } from '../utils/constants';

export function useWeatherData(stationId = 'BHARATI') {
  const [latestWeather, setLatestWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [freshness, setFreshness] = useState({
    status: 'LIVE',
    source_name: 'NPDC Bharati AWS',
    minutes_since_observation: 3.5,
    consecutive_failures: 0
  });
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replayState, setReplayState] = useState({ is_running: false, speed: 5.0 });

  // 1. Fetch Latest Observation & Freshness Status
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/latest/${stationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.has_data !== false) {
          setLatestWeather(data);
        }
        if (data.freshness) {
          setFreshness(data.freshness);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch latest weather:', e);
    }
  }, [stationId]);

  // 2. Fetch 24-Hour Historical Observation Series (1-minute resolution)
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // 1,440 one-minute observations represent the most recent 24 hours.
      const res = await fetch(`${API_BASE}/api/v1/weather/history/${stationId}?limit=1440`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.observations || []);
        if (data.observations && data.observations.length > 0) {
          const newest = data.observations[data.observations.length - 1];
          setLatestWeather(prev => prev || newest);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch weather history:', e);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  // 3. Fetch Flagged Anomalies
  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/anomalies/${stationId}`);
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch weather anomalies:', e);
    }
  }, [stationId]);

  // 4. Trigger Storm Replay Mode
  const triggerReplay = useCallback(async (action = 'start', speed = 5.0) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed, station_id: stationId })
      });
      if (res.ok) {
        const data = await res.json();
        setReplayState({ is_running: action === 'start', speed });
        if (action === 'start') {
          setFreshness(prev => ({
            ...prev,
            status: 'REPLAY',
            source_name: `Historical Replay (${speed}x)`
          }));
        } else {
          fetchLatest();
        }
      }
    } catch (e) {
      console.error('Failed to trigger replay:', e);
    }
  }, [stationId, fetchLatest]);

  // Initial Load
  useEffect(() => {
    fetchLatest();
    fetchHistory();
    fetchAnomalies();
    
    // Poll freshness state every 30 seconds
    const statusInterval = setInterval(fetchLatest, 30000);
    return () => clearInterval(statusInterval);
  }, [fetchLatest, fetchHistory, fetchAnomalies]);

  // WebSocket Listener for real-time discrete updates
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only handle weather observations
          if (data.type === 'weather_observation' && data.station_id === stationId) {
            setLatestWeather(data);
            setHistory(prev => {
              const byTimestamp = new Map(
                prev.map((point) => [Date.parse(point.observed_at), point])
              );
              byTimestamp.set(Date.parse(data.observed_at), data);

              return [...byTimestamp.entries()]
                .filter(([timestamp]) => Number.isFinite(timestamp))
                .sort(([left], [right]) => left - right)
                .slice(-1440)
                .map(([, point]) => point);
            });
            setFreshness(prev => ({
              ...prev,
              status: data.source === 'replay' ? 'REPLAY' : 'LIVE',
              last_new_observation_at: new Date().toISOString(),
              minutes_since_observation: 0.1
            }));
          }
        } catch (err) {
          // ignore
        }
      };
    } catch (e) {
      // ignore
    }

    return () => {
      if (ws) ws.close();
    };
  }, [stationId]);

  // 5. Direct Live Fetch from NCPOR server
  const syncLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/sync/${stationId}`, { method: 'POST' });
      if (res.ok) {
        await fetchHistory();
        await fetchLatest();
      }
    } catch (e) {
      console.error('Failed to sync live data:', e);
    }
  }, [stationId, fetchHistory, fetchLatest]);

  return {
    latestWeather,
    history,
    freshness,
    anomalies,
    loading,
    replayState,
    triggerReplay,
    syncLive,
    refetchHistory: fetchHistory,
    refetchLatest: fetchLatest
  };
}
