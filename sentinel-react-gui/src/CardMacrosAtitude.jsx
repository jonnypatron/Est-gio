import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Frequência a que o ecrã é atualizado (ms). As mensagens chegam a ~10 Hz,
// mas atualizar o texto tão depressa torna os números ilegíveis.
// 300 ms = ~3 atualizações/segundo → estável e fácil de ler.
const UI_REFRESH_MS = 300;

function CardMacrosAtitude({ ros, isActive }) {
  const topicRef    = useRef(null);
  const odomRef     = useRef(null);
  const isActiveRef = useRef(isActive);

  // Último valor recebido (atualizado a cada mensagem, sem re-render)
  const latestRef   = useRef({ roll: 0, pitch: 0, yaw: 0 });
  // Valor mostrado (atualizado a ritmo lento e legível)
  const [orientacao, setOrientacao] = useState({ roll: 0, pitch: 0, yaw: 0 });

  // Flash curto ao enviar uma task
  const [flashId, setFlashId] = useState(null);
  const flashStyle = { backgroundColor: '#8ec7ff', color: '#111', transition: 'none' };

  // Objetos Three.js reutilizáveis
  const _quat  = useRef(new THREE.Quaternion());
  const _euler = useRef(new THREE.Euler());

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    // Tópico de publicação de tarefas
    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/tasks',
      messageType: 'std_msgs/msg/String',
      throttle_rate: 100,
    });
    topicRef.current.advertise();

    // Odometria → orientação (roll/pitch/yaw)
    odomRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/vvhub_odom',
      messageType: 'nav_msgs/msg/Odometry',
      throttle_rate: 100,
    });

    odomRef.current.subscribe((msg) => {
      if (!isActiveRef.current) return;   // poupa CPU quando a página de Controlo não está visível
      const q = msg?.pose?.pose?.orientation;
      if (!q || typeof q.x === 'undefined' || isNaN(q.x)) return;

      _quat.current.set(q.x, q.y, q.z, q.w);
      _euler.current.setFromQuaternion(_quat.current, 'XYZ');
      const rad2deg = 180 / Math.PI;
      latestRef.current = {
        roll:  _euler.current.x * rad2deg,
        pitch: _euler.current.y * rad2deg,
        yaw:   _euler.current.z * rad2deg,
      };
    });

    // Atualiza o ecrã a ritmo lento (só quando a página está ativa)
    const ui = setInterval(() => {
      if (isActiveRef.current) setOrientacao(latestRef.current);
    }, UI_REFRESH_MS);

    return () => {
      clearInterval(ui);
      if (topicRef.current) topicRef.current.unadvertise();
      if (odomRef.current)  odomRef.current.unsubscribe();
    };
  }, [ros]);

  const sendTask = (id, nome) => {
    if (topicRef.current) {
      topicRef.current.publish(new window.ROSLIB.Message({ data: id.toString() }));
      console.log(`Macro enviada: ${nome} (ID: ${id})`);
      setFlashId(id);
      setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 180);
    }
  };

  return (
    <div className="card">
      <div className="macro-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>ATTITUDE</h3>
        <div className="raw-data-badge">
          <span style={{ color: '#ff4d4d' }}>R: {orientacao.roll.toFixed(0)}° </span>
          <span style={{ color: '#00d66b' }}>P: {orientacao.pitch.toFixed(0)}° </span>
          <span style={{ color: '#3498db' }}>Y: {orientacao.yaw.toFixed(0)}°</span>
        </div>
      </div>

      <div className="macro-grid">
        <button className="macro-btn att-accent" style={flashId === 1 ? flashStyle : undefined} onClick={() => sendTask(1, 'Pitch 45º')}>
          <span>Pitch 45º</span>
        </button>
        <button className="macro-btn att-accent" style={flashId === 2 ? flashStyle : undefined} onClick={() => sendTask(2, 'Yaw 20º')}>
          <span>Yaw 20º</span>
        </button>
        <button className="macro-btn att-accent" style={flashId === 3 ? flashStyle : undefined} onClick={() => sendTask(3, 'Pitch 45º + Roll 45º')}>
          <span>Pitch 45º<br />Roll 45º</span>
        </button>
        <button className="macro-btn att-accent" style={flashId === 8 ? flashStyle : undefined} onClick={() => sendTask(8, 'Pitch 360º')}>
          <span>Pitch 360º</span>
        </button>
      </div>
    </div>
  );
}

export default CardMacrosAtitude;