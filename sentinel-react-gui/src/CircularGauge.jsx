import React from 'react';

function CircularGauge({ value, min, max, label, unit, color="#00d66b" }) {
  const radius = 55;
  const center = 70; 
  const circumference = 2 * Math.PI * radius;
  const arcPerimeter = circumference * 0.75; 

  const progress = Math.max(min, Math.min(max, value)); 
  const percentage = (progress - min) / (max - min);
  const offset = circumference - (percentage * arcPerimeter);

  return (
    <div className="gauge-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="140" height="110" viewBox="0 0 140 140" className="gauge-svg">
        <circle
          cx={center} cy={center} r={radius}
          stroke="#222"
          strokeWidth="12" 
          fill="none"
          strokeDasharray={`${arcPerimeter} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${center} ${center})`} 
        />
        <circle
          cx={center} cy={center} r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={`${arcPerimeter} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
        />
      </svg>

      <div className="gauge-text" style={{ marginTop: '-75px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{value.toFixed(1)}</span>
        <span style={{ fontSize: '12px', color: '#888', marginLeft: '2px' }}>{unit}</span>
      </div>
      <div style={{ marginTop: '35px', fontSize: '11px', color: '#666', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
    </div>
  );
}

export default CircularGauge;