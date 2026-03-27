
import React from 'react';

function CircularGauge({ value, min, max, label, unit, color="#00d66b" }) {

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const arcPerimeter = circumference * 0.75; 

  const progress = Math.max(min, Math.min(max, value)); 
  const percentage = (progress - min) / (max - min);
  const offset = circumference - (percentage * arcPerimeter);

  return (
    <div className="gauge-wrapper">
      <svg width="120" height="90" viewBox="0 0 120 120" className="gauge-svg">
        <circle
          cx="60" cy="60" r={radius}
          stroke="#222"
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${arcPerimeter} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(135 60 60)" 
        />

        <circle
          cx="60" cy="60" r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${arcPerimeter} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(135 60 60)"
          className="gauge-progress" 
        />
      </svg>

      <div className="gauge-text">
        <span className="gauge-value">{value.toFixed(1)}</span>
        <span className="gauge-unit">{unit}</span>
      </div>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

export default CircularGauge;