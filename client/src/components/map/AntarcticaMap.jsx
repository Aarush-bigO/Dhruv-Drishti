import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { STATIONS } from '../../utils/constants';
import StationMarker from './StationMarker';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export default function AntarcticaMap({ onStationSelect, liveData }) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[-75, 0]}
        zoom={3}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {Object.values(STATIONS).map(station => {
          const stationLiveData = liveData[station.id];
          // Default alert level is normal
          let alertLevel = 'normal';
          
          if (stationLiveData) {
            // Check if any equipment has warning/critical
            const alerts = Object.values(stationLiveData).filter(d => d && typeof d === 'object' && d.alert_level);
            if (alerts.some(a => a.alert_level === 'critical')) alertLevel = 'critical';
            else if (alerts.some(a => a.alert_level === 'warning')) alertLevel = 'warning';
          }
          
          return (
            <StationMarker 
              key={station.id} 
              station={station} 
              alertLevel={alertLevel}
              onSelect={onStationSelect}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
