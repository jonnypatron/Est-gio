import { useState, useEffect, useRef } from 'react';

import iconGiroscopio from './assets/giroscopio.png';

function CardMacrosAtitude({ ros }) {
  const topicRef = useRef(null);

  useEffect(() => {
    if (ros) {
      topicRef.current = new window.ROSLIB.Topic({
        ros: ros,
        name: '/tasks',
        messageType: 'std_msgs/String',
        throttle_rate: 100
      });
      topicRef.current.advertise();
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
      {/* NOVO: Card Header compacto para separar título e ícone */}
      <div className="macro-card-header">
        <h3 className="card-title">ATTITUDE</h3>
        <img src={iconGiroscopio} alt="Giroscópio" className="card-macro-icon icon-blue-tint" />
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