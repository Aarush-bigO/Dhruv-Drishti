import React from 'react';
import { ALERT_LEVELS } from '../../utils/constants';

export default function RoomZone({ room, alertLevel, isHovered, isSelected, onClick, onMouseEnter, onMouseLeave }) {
  const color = ALERT_LEVELS[alertLevel]?.color || '#374151';
  
  // Calculate fill color with opacity
  let fillOpacity = 0.05;
  if (alertLevel === 'critical') fillOpacity = 0.15;
  if (alertLevel === 'warning') fillOpacity = 0.1;
  if (isHovered) fillOpacity += 0.06;
  if (isSelected) fillOpacity += 0.12;

  return (
    <g 
      onClick={onClick}
      onMouseEnter={onMouseEnter} 
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer', transition: 'all 0.3s' }}
    >
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        fill={isSelected ? '#0284c7' : color}
        fillOpacity={fillOpacity}
        stroke={isSelected ? '#38bdf8' : isHovered ? '#60a5fa' : '#374151'}
        strokeWidth={isSelected ? '2.5' : '2'}
        strokeDasharray={isSelected ? '6 3' : 'none'}
        rx="4"
        className="transition-all duration-300"
      />
      <text
        x={room.x + room.w / 2}
        y={room.y + 20}
        fill={isSelected ? '#38bdf8' : isHovered ? '#f3f4f6' : '#9ca3af'}
        fontSize="10"
        fontWeight="bold"
        textAnchor="middle"
        className="pointer-events-none transition-colors duration-300"
      >
        {room.name}
      </text>
    </g>
  );
}
