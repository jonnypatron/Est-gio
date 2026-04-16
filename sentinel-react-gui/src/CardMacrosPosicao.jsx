import { useState, useEffect, useRef } from 'react';

import iconPosition from './assets/position.png';

function CardMacrosPosicao({ ros }) {
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
      {/* NOVO: Card Header compacto */}
      <div className="macro-card-header">
        <h3 className="card-title">POSITION</h3>
        <img src={iconPosition} alt="Posição" className="card-macro-icon icon-green-tint" />
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
        
        <button className="macro-btn sys-accent reset-btn" onClick={() => sendTask(9, 'Reset Odometry')}>
          RESET ODOMETRIA
        </button>
      </div>
    </div>
  );
}

export default CardMacrosPosicao;