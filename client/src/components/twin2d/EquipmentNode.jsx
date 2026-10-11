import React from 'react';
import { ALERT_LEVELS } from '../../utils/constants';

export default function EquipmentNode({ equipment, alertLevel, isSelected, onClick }) {
  const color = ALERT_LEVELS[alertLevel]?.color || ALERT_LEVELS.normal.color;
  
  return (
    <g 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: 'pointer' }}
    >
      <title>{equipment.name} ({alertLevel})</title>
      
      {/* Pulse effect for non-normal states */}
      {alertLevel !== 'normal' && (
        <circle
          cx={equipment.x}
          cy={equipment.y}
          r="14"
          fill={color}
          opacity="0.3"
        >
          <animate 
            attributeName="r" 
            values="10;20;10" 
            dur="2s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="opacity" 
            values="0.5;0;0.5" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
      )}

      {/* Main node */}
      <circle
        cx={equipment.x}
        cy={equipment.y}
        r={isSelected ? "12" : "10"}
        fill={color}
        stroke="#ffffff"
        strokeWidth={isSelected ? "3" : "1"}
        className="transition-all duration-300 hover:brightness-125"
      />
      
      {/* Icon placeholder (simple letter for now) */}
      <text
        x={equipment.x}
        y={equipment.y + 4}
        fill="#000"
        fontSize="10"
        fontWeight="bold"
        textAnchor="middle"
        className="pointer-events-none"
      >
        {equipment.id.charAt(0)}
      </text>
    </g>
  );
}
