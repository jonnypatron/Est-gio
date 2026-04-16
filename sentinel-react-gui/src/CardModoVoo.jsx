import { useState, useEffect, useRef } from 'react';


function CardModoVoo({ ros }) {
  // Estado local para saber que modo está selecionado (0, 1 ou 2)
  const [modoAtivo, setModoAtivo] = useState(0);
  const topicRef = useRef(null);

  useEffect(() => {
    if (!ros) return;

    // Configurar o tópico
    topicRef.current = new window.ROSLIB.Topic({
      ros: ros,
      name: '/controller_state',
      messageType: 'std_msgs/msg/Int32',
      throttle_rate: 100
    });
    topicRef.current.advertise();

    // 1. Publica imediatamente a alteração quando o utilizador clica
    const msg = new window.ROSLIB.Message({ data: modoAtivo });
    topicRef.current.publish(msg);
    console.log(`Modo de Voo: ${modoAtivo}`);

    // 2. Heartbeat: Continua a publicar o mesmo estado a cada 1 segundo (segurança)
    const interval = setInterval(() => {
      topicRef.current.publish(new window.ROSLIB.Message({ data: modoAtivo }));
    }, 1000);

    // Limpeza quando o componente é destruído ou o modo muda
    return () => {
      clearInterval(interval);
      if (topicRef.current) {
        topicRef.current.unadvertise();
      }
    };
  }, [ros, modoAtivo]); // Re-executa sempre que o ROS liga ou o modo muda

  return (
    <div className="card modo-voo-card">
      <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '12px' }}>
        CONTROLLER STATE
      </h3>
      
      <div className="modo-selector">
        <button 
          className={`modo-btn ${modoAtivo === 0 ? 'active-off' : ''}`}
          onClick={() => setModoAtivo(0)}
        >
          OFF 
        </button>
        
        <button 
          className={`modo-btn ${modoAtivo === 1 ? 'active-att' : ''}`}
          onClick={() => setModoAtivo(1)}
        >
          ATTITUDE
        </button>
        
        <button 
          className={`modo-btn ${modoAtivo === 2 ? 'active-pos' : ''}`}
          onClick={() => setModoAtivo(2)}
        >
          POSITION
        </button>
      </div>
    </div>
  );
}

export default CardModoVoo;