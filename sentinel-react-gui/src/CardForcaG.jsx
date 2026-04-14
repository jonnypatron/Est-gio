import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardForcaG({ ros }) {
  const [gForce, setGForce] = useState(0.0);

  useEffect(() => {
    if (!ros) return;

    const topicoAccel = new ROSLIB.Topic({
      ros: ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 50 // Proteção contra bloqueios!
    });

    topicoAccel.subscribe((msg) => {
      // Vai buscar o Z dentro da estrutura correta
      const zAccel = msg.linear_acceleration.z;
      
      // Converte para Força G (Divide pela gravidade 9.81)
      const gReal = zAccel / 9.81;
      setGForce(gReal);
    });

    return () => topicoAccel.unsubscribe();
  }, [ros]);

  const displayG = Math.max(-3, Math.min(3, gForce));

  const tapeOffset = displayG * 60; 

  return (
    <div className="card gforce-card">
      <h2>FORÇA Gz</h2>

      <div className="tape-window">
        <div className="tape-center-mark">
          <span className="current-g-value">{gForce.toFixed(2)} G</span>
        </div>

        <div 
          className="moving-tape" 
          style={{ transform: `translateY(${tapeOffset}px)` }}
        >
          {[3, 2, 1, 0, -1, -2, -3].map((val) => (
            <div key={val} className="tape-tick">
              <span className="tick-label">{val > 0 ? `+${val}` : val}</span>
              <div className={`tick-line ${val === 0 ? 'zero-line' : ''}`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CardForcaG;