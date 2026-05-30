import { useState, useEffect, useRef } from 'react';

// Mensagens chegam a ~10 Hz; atualizar o texto a esse ritmo torna-o ilegível.
// 300 ms = ~3 atualizações/segundo → estável e fácil de ler.
const UI_REFRESH_MS = 300;

function CardMacrosPosicao({ ros, isActive }) {
  const topicRef    = useRef(null);
  const odomRef     = useRef(null);
  const isActiveRef = useRef(isActive);

  const latestRef   = useRef({ x: 0, y: 0, z: 0 });
  const [posicao, setPosicao] = useState({ x: 0, y: 0, z: 0 });

  // Flash curto ao enviar uma task
  const [flashId, setFlashId] = useState(null);
  const flashStyle = { backgroundColor: '#00d66b', color: '#062', transition: 'none' };

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

    // Odometria → posição (x/y/z)
    odomRef.current = new window.ROSLIB.Topic({
      ros,
      name: '/vvhub_odom',
      messageType: 'nav_msgs/msg/Odometry',
      throttle_rate: 100,
    });

    odomRef.current.subscribe((msg) => {
      if (!isActiveRef.current) return;   // poupa CPU quando a página de Controlo não está visível
      const p = msg?.pose?.pose?.position;
      if (!p || typeof p.x === 'undefined' || isNaN(p.x)) return;
      latestRef.current = { x: p.x, y: p.y, z: p.z };
    });

    const ui = setInterval(() => {
      if (isActiveRef.current) setPosicao(latestRef.current);
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
        <h3 className="card-title" style={{ margin: 0 }}>POSITION</h3>
        <div className="raw-data-badge">
          <span style={{ color: '#ff4d4d' }}>X: {posicao.x.toFixed(2)} </span>
          <span style={{ color: '#00d66b' }}>Y: {posicao.y.toFixed(2)} </span>
          <span style={{ color: '#3498db' }}>Z: {posicao.z.toFixed(2)}</span>
        </div>
      </div>

      <div className="macro-grid">
        <button className="macro-btn pos-accent" style={flashId === 4 ? flashStyle : undefined} onClick={() => sendTask(4, 'X 10 cm')}>
          <span>X 10 cm</span>
        </button>
        <button className="macro-btn pos-accent" style={flashId === 5 ? flashStyle : undefined} onClick={() => sendTask(5, 'Z 10 cm')}>
          <span>Z 10 cm</span>
        </button>
        <button className="macro-btn pos-accent" style={flashId === 6 ? flashStyle : undefined} onClick={() => sendTask(6, 'XYZ Combo')}>
          <span>X:10 Y:10 Z:5</span>
        </button>
        <button className="macro-btn pos-accent" style={flashId === 7 ? flashStyle : undefined} onClick={() => sendTask(7, 'Roll 45º + X 10cm')}>
          <span>Roll 45º<br />X 10 cm</span>
        </button>
      </div>
    </div>
  );
}

export default CardMacrosPosicao;