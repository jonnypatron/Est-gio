import { useState, useEffect, useRef } from 'react';

function CardModoVoo({ ros }) {
  const [modoAtivo, setModoAtivo] = useState(0);
  const topicRef           = useRef(null);
  const userHasSelectedRef = useRef(false);
    // Guarda se o operador já clicou pelo menos uma vez num modo.
    // SEGURANÇA: sem este guarda, o useEffect publicaria imediatamente o modo 0 (OFF)
    // assim que o ROS liga, podendo sobrepor o estado real do robô (ex: estava em ATTITUDE).
    // Ao ligar a interface, o robô mantém o seu estado até o operador selecionar explicitamente.

  // ── Effect 1: Cria e anuncia o tópico quando o ROS liga ──────────────────────
  // Separado do Effect 2 para não depender de modoAtivo — o tópico só precisa
  // de ser criado uma vez por ligação, independentemente do modo selecionado.
  useEffect(() => {
    if (!ros) return;

    topicRef.current = new window.ROSLIB.Topic({
      ros:          ros,
      name:         '/controller_state',
      messageType:  'std_msgs/msg/Int32',
      throttle_rate: 100,
    });
    topicRef.current.advertise();

    return () => {
      if (topicRef.current) topicRef.current.unadvertise();
    };
  }, [ros]);

  // ── Effect 2: Publica o modo e mantém heartbeat ───────────────────────────────
  // Só corre após o operador ter clicado explicitamente (userHasSelectedRef=true).
  // O heartbeat a 1 Hz garante que o robô não perde o comando de modo
  // em caso de frame dropout no ROSBridge — é um mecanismo de segurança.
  useEffect(() => {
    if (!ros || !topicRef.current || !userHasSelectedRef.current) return;

    // Publicação imediata ao mudar de modo
    topicRef.current.publish(new window.ROSLIB.Message({ data: modoAtivo }));
    console.log(`Flight mode: ${modoAtivo}`);

    // Heartbeat: republica o mesmo estado a cada 1 s para garantir consistência
    const interval = setInterval(() => {
      if (topicRef.current) {
        topicRef.current.publish(new window.ROSLIB.Message({ data: modoAtivo }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ros, modoAtivo]);

  // ── Handler dos botões ────────────────────────────────────────────────────────
  // Ativa o guarda de segurança na primeira seleção e atualiza o modo.
  const handleModoClick = (modo) => {
    userHasSelectedRef.current = true;
    setModoAtivo(modo);
  };

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
    </div>
  );
}

export default CardModoVoo;