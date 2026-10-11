import { useState, useEffect, useRef } from 'react';
import { WS_URL } from '../utils/constants';

export function useWebSocket() {
  const [latestData, setLatestData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const ws = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    let reconnectTimer;

    const connect = () => {
      if (ws.current?.readyState === WebSocket.OPEN) return;

      setConnectionStatus('Connecting...');
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        retryCount.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatestData(prev => ({
            ...prev,
            [data.station_id]: {
              ...prev[data.station_id],
              [data.equipment_id]: data,
              timestamp: data.timestamp, // station level
              outdoor_temp: data.outdoor_temp, // station level
            }
          }));
        } catch (e) {
          console.error('WebSocket message parsing error:', e);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          reconnectTimer = setTimeout(connect, 3000);
        } else {
          setConnectionStatus('Connection Failed');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { latestData, isConnected, connectionStatus };
}
