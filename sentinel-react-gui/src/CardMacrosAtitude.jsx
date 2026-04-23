import { useState, useEffect, useRef } from 'react';

import iconGiroscopio from './assets/giroscopio.png';

function CardMacrosAtitude({ ros, isActive }) {
  const topicRef = useRef(null);
  const isActiveRef = useRef(isActive);

  // ESTADO CORRIGIDO (igual ao CardDadosIMU)
  const [velAngular, setVelAngular] = useState({ x: 0, y: 0, z: 0 });

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

      // SUBSCRIÇÃO CORRIGIDA (O escudo exato do CardDadosIMU)
      topicoImu.subscribe((msg) => {
        if (!isActiveRef.current) return;
        const vel = msg.angular_velocity;

        if (!vel || typeof vel.x === 'undefined') return;

        setVelAngular(vel);
      });

    }
    return () => {
      if (topicRef.current) topicRef.current.unadvertise();
      // NOTA: Tive de mudar para "topicoImu" porque o escopo da variável acabava dentro do if
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
        <h3 className="card-title" style={{ margin: 0 }}>ATTITUDE</h3>
        <div className="raw-data-badge">
            <span style={{ color: '#ff4d4d' }}>X: {velAngular.x.toFixed(2)} </span>
            <span style={{ color: '#00d66b' }}>Y: {velAngular.y.toFixed(2)} </span>
            <span style={{ color: '#3498db' }}>Z: {velAngular.z.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="macro-grid">
        <button className="macro-btn att-accent" onClick={() => sendTask(1, 'Pitch 45º')}>
          <span>Pitch 45º</span>
        </button>
        <button className="macro-btn att-accent" onClick={() => sendTask(2, 'Yaw 20º')}>
          <span>Yaw 20º</span>
        </button>
        <button className="macro-btn att-accent" onClick={() => sendTask(3, 'Pitch 45º + Roll 45º')}>
          <span>Pitch 45º<br/>Roll 45º</span>
        </button>
        <button className="macro-btn att-accent" onClick={() => sendTask(8, 'Pitch 360º')}>
          <span>Pitch 360º</span>
        </button>
      </div>
    </div>
  );
}

export default CardMacrosAtitude;