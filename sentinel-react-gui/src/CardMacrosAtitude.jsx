import { useState, useEffect, useRef } from 'react';

function CardMacrosAtitude({ ros, isActive }) {
  const topicRef    = useRef(null);
  const imuRef      = useRef(null);   // guarda a instância do tópico IMU para o cleanup
  const isActiveRef = useRef(isActive);

  const [velAngular, setVelAngular] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    // Tópico de publicação de tarefas
    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/tasks',
      messageType: 'std_msgs/String',
      throttle_rate: 100,
    });
    topicRef.current.advertise();

    // Tópico IMU para o badge de dados raw
    // CORRIGIDO: guardado em imuRef para que o cleanup possa chamar unsubscribe()
    // (na versão anterior, a variável local era inacessível fora do if-block)
    imuRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 100,
    });

    imuRef.current.subscribe((msg) => {
      if (!isActiveRef.current) return;
      const vel = msg.angular_velocity;
      if (!vel || typeof vel.x === 'undefined') return;
      setVelAngular(vel);
    });

    return () => {
      if (topicRef.current) topicRef.current.unadvertise();
      if (imuRef.current)   imuRef.current.unsubscribe();   // antes em falta!
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
          <span>Pitch 45º<br />Roll 45º</span>
        </button>
        <button className="macro-btn att-accent" onClick={() => sendTask(8, 'Pitch 360º')}>
          <span>Pitch 360º</span>
        </button>
      </div>
    </div>
  );
}

export default CardMacrosAtitude;