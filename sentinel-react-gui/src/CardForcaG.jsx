import { useState, useEffect } from 'react';


function CardForcaG({ ros }) {
  const [gForce, setGForce] = useState(0.0);

  useEffect(() => {
    if (!ros) return;

    const topicoAccel = new window.ROSLIB.Topic({
      ros: ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 50
    });

    topicoAccel.subscribe((msg) => {
      const zAccel = msg.linear_acceleration.z;
      const gReal = zAccel / 9.81;
      setGForce(gReal);
    });

    return () => topicoAccel.unsubscribe();
  }, [ros]);

  const displayG = Math.max(-3, Math.min(3, gForce));

  // Reduzido de 60 para 40 para a fita caber melhor no ecrã mobile!
  const tapeOffset = displayG * 40; 

  return (
    <div className="card gforce-card">
      {/* Escondemos o título para dar todo o espaço à fita */}
      <h2 style={{ display: 'none' }}>FORÇA Gz</h2>

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