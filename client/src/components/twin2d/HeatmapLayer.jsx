import React from 'react';

export default function HeatmapLayer({ rooms, liveData }) {
  return (
    <g className="heatmap-layer pointer-events-none">
      <defs>
        <radialGradient id="heat-danger">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heat-cold">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {rooms.map(room => 
        room.equipment?.map(eq => {
          const eqData = liveData[eq.id];
          if (!eqData) return null;

          const elements = [];
          
          // High failure risk blob
          if (eqData.failure_risk > 0.4) {
            const radius = 40 + (eqData.failure_risk * 40);
            elements.push(
              <ellipse 
                key={`risk-${eq.id}`}
                cx={eq.x} 
                cy={eq.y} 
                rx={radius} 
                ry={radius * 0.8}
                fill="url(#heat-danger)" 
              />
            );
          }

          // Extreme cold blob (indoor temp < 5)
          if (eqData.indoor_temp !== undefined && eqData.indoor_temp < 5) {
            elements.push(
              <ellipse 
                key={`cold-${eq.id}`}
                cx={eq.x} 
                cy={eq.y} 
                rx="50" 
                ry="50"
                fill="url(#heat-cold)" 
              />
            );
          }

          return elements;
        })
      )}
    </g>
  );
}
