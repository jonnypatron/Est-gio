import { useState, useEffect, useRef } from 'react';

import iconPosition from './assets/position.png';

function CardMacrosPosicao({ ros, isActive }) {
  const topicRef = useRef(null);
  const isActiveRef = useRef(isActive);

  const [acelLinear, setAcelLinear] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (ros) {
      topicRef.current = new window.ROSLIB.Topic({
        ros: ros,
        name: '/tasks',
        messageType: 'std_msgs/String',
        throttle_rate: 100
      });
      topicRef.current.advertise();

      const topicoImu = new window.ROSLIB.Topic({
        ros: ros, name: '/imu_apps', messageType: 'sensor_msgs/msg/Imu', throttle_rate: 100
      });

      topicoImu.subscribe((msg) => {
        if (!isActiveRef.current) return;
        const acel = msg.linear_acceleration;
        
        if (!acel || typeof acel.x === 'undefined') return;
        
        setAcelLinear(acel);
      });

    }
    return () => {
      if (topicRef.current) topicRef.current.unadvertise();
    };
  }, [ros]);

  const sendTask = (id, nome) => {
    if (topicRef.current) {
      topicRef.current.publish(new window.ROSLIB.Message({ data: id.toString() }));
      console.log(`Macro enviada: ${nome} (ID: ${id})`);
    }
  };

  return (
    <div className="card">
      <div className="macro-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>POSITION</h3>
        <div className="raw-data-badge">
            <span style={{ color: '#ff4d4d' }}>X: {acelLinear.x.toFixed(2)} </span>
            <span style={{ color: '#00d66b' }}>Y: {acelLinear.y.toFixed(2)} </span>
            <span style={{ color: '#3498db' }}>Z: {acelLinear.z.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="macro-grid">
        <button className="macro-btn pos-accent" onClick={() => sendTask(4, 'X 10 cm')}>
          <span>X 10 cm</span>
        </button>
        <button className="macro-btn pos-accent" onClick={() => sendTask(5, 'Z 10 cm')}>
          <span>Z 10 cm</span>
        </button>
        <button className="macro-btn pos-accent" onClick={() => sendTask(6, 'XYZ Combo')}>
          <span>X:10 Y:10 Z:5</span>
        </button>
        <button className="macro-btn pos-accent" onClick={() => sendTask(7, 'Roll 45º + X 10cm')}>
          <span>Roll 45º<br/>X 10 cm</span>
        </button>
      </div>
    </div>
  );
}

export default CardMacrosPosicao;