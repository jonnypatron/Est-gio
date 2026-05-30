import { useState, useEffect, useRef } from 'react';

const MODE_INFO = {
  0: { label: 'OFF',      color: '#888888' },
  1: { label: 'ATTITUDE', color: '#8ec7ff' },
  2: { label: 'POSITION', color: '#00d66b' },
};

function CardModoVoo({ ros }) {
  const [modoAtivo, setModoAtivo] = useState(0);
  const [confirmedMode, setConfirmedMode] = useState(null); // estado REAL no bus
  const topicRef           = useRef(null);
  const userHasSelectedRef = useRef(false);

  // ── Effect 1: Cria/anuncia o tópico de comando + subscreve o estado real ──────
  useEffect(() => {
    if (!ros) return;

    topicRef.current = new window.ROSLIB.Topic({
      ros,
      name:         '/controller_state',
      messageType:  'std_msgs/msg/Int32',
      throttle_rate: 100,
    });
    topicRef.current.advertise();

    // ECO: ouvimos o que está realmente no bus para confirmar o modo.
    // Se o robô (ou o nosso próprio heartbeat) publica /controller_state,
    // refletimos esse valor — útil sobretudo no arranque, antes de o operador clicar.
    const stateTopic = new window.ROSLIB.Topic({
      ros,
      name:         '/controller_state',
      messageType:  'std_msgs/msg/Int32',
      throttle_rate: 200,
    });
    stateTopic.subscribe((msg) => {
      if (typeof msg?.data !== 'undefined') setConfirmedMode(msg.data);
    });

    return () => {
      stateTopic.unsubscribe();
      if (topicRef.current) topicRef.current.unadvertise();
    };
  }, [ros]);

  // ── Effect 2: Publica o modo e mantém heartbeat ───────────────────────────────
  useEffect(() => {
    if (!ros || !topicRef.current || !userHasSelectedRef.current) return;

    topicRef.current.publish(new window.ROSLIB.Message({ data: modoAtivo }));
    console.log(`Flight mode: ${modoAtivo}`);

    const interval = setInterval(() => {
      if (topicRef.current) {
        topicRef.current.publish(new window.ROSLIB.Message({ data: modoAtivo }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ros, modoAtivo]);

  const handleModoClick = (modo) => {
    userHasSelectedRef.current = true;
    setModoAtivo(modo);
  };

  // Estado a mostrar na barra "LIVE": o que está realmente no bus
  const live = confirmedMode !== null ? MODE_INFO[confirmedMode] : null;
  // Há divergência entre a intenção do operador e o estado confirmado?
  const syncing = userHasSelectedRef.current && confirmedMode !== null && confirmedMode !== modoAtivo;

  return (
    <div className="card modo-voo-card">
      <div className="modo-selector">
        <button
          className={`modo-btn ${modoAtivo === 0 ? 'active-off' : ''}`}
          onClick={() => handleModoClick(0)}
        >
          OFF
        </button>
        <button
          className={`modo-btn ${modoAtivo === 1 ? 'active-att' : ''}`}
          onClick={() => handleModoClick(1)}
        >
          ATTITUDE
        </button>
        <button
          className={`modo-btn ${modoAtivo === 2 ? 'active-pos' : ''}`}
          onClick={() => handleModoClick(2)}
        >
          POSITION
        </button>
      </div>

      {/* ECO: estado real reportado pelo bus */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', marginTop: '6px', fontSize: '10px', letterSpacing: '1px',
        fontFamily: "'Courier New', monospace",
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: syncing ? '#ffd84a' : (live ? live.color : '#444'),
          boxShadow: live ? `0 0 6px ${live.color}` : 'none',
        }} />
        <span style={{ color: '#777' }}>LIVE:</span>
        <span style={{ color: live ? live.color : '#555', fontWeight: 'bold' }}>
          {live ? live.label : '—'}{syncing ? ' (syncing…)' : ''}
        </span>
      </div>
    </div>
  );
}

export default CardModoVoo;