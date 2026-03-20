import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

function CardBateria({ ros }) {
  // State - declara-se as variáveis e as funções que as atualizam
  // "setBateria" em vez de "document.getElementById"
  const [bateria, setBateria] = useState('--');
  const [voltagem, setVoltagem] = useState('--');

  // Effect - corre automaticamente quando o cartão aparece no ecrã
  useEffect(() => {
    // Configura-se o tópico exatamente como no HTML
    const topicoBateria = new ROSLIB.Topic({
      ros: ros, // Ligação que foi passada pelo App.jsx
      name: '/Battery',
      messageType: 'sensor_msgs/msg/BatteryState'
    });

    // Subscreve-se
    topicoBateria.subscribe((mensagem) => {
      setBateria((mensagem.percentage * 100).toFixed(0));
      setVoltagem(mensagem.voltage.toFixed(2));
    });

    // O "return" num useEffect serve para limpar
    // Se o cartão desaparecer do ecrã, cancela a subscrição para não gastar memória
    return () => {
      topicoBateria.unsubscribe();
    };
  }, [ros]); // "só refaz esta subscrição se a ligação cair e voltar"

  // Visual ihual ao HTML
  return (
    <div className="card">
      <h2>Energia</h2>
      <div className="data-value" style={{ color: '#00d66b' }}>
        {bateria} %
      </div>
      <div className="data-value" style={{ color: '#00d66b' }}>
        {voltagem} V
      </div>
    </div>
  );
}

export default CardBateria;