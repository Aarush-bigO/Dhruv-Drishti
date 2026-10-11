import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ALERT_LEVELS } from '../../utils/constants';

export default function StationMarker({ station, alertLevel, onSelect }) {
  const color = ALERT_LEVELS[alertLevel]?.color || ALERT_LEVELS.normal.color;
  
  const customIcon = L.divIcon({
    className: 'custom-station-icon',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        ${alertLevel !== 'normal' ? `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; background-color: ${color}; opacity: 0.5; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Marker position={[station.lat, station.lon]} icon={customIcon}>
      <Popup className="station-popup">
        <div className="p-1">
          <h3 className="font-bold text-lg mb-1">{station.name}</h3>
          <p className="text-sm text-gray-600 mb-1">{station.description}</p>
          <div className="text-xs text-gray-500 mb-3">
            <div>Lat: {station.lat}, Lon: {station.lon}</div>
            <div>Crew: {station.crew} | Est: {station.established}</div>
          </div>
          <button 
            onClick={() => onSelect(station.id)}
            className="w-full bg-polar-accent hover:bg-blue-600 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors"
          >
            View Digital Twin &rarr;
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
