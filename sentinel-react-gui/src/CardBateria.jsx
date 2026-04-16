import { useState, useEffect } from 'react';

import MiniChart from './MiniChart';

function CardBateria({ ros }) {
  const [bateria, setBateria] = useState('--');
  const [voltagem, setVoltagem] = useState('--');

  const [historicoVoltagem, setHistoricoVoltagem] = useState([]);

  useEffect(() => {
    if (!ros) return;

    const topicoBateria = new window.ROSLIB.Topic({
      ros: ros,
      name: '/Battery',
      messageType: 'sensor_msgs/msg/BatteryState',
      throttle_rate: 900
    });

    topicoBateria.subscribe((mensagem) => {
      const perc = (mensagem.percentage * 100).toFixed(0);
      const volt = mensagem.voltage.toFixed(2);
      
      setBateria(perc);
      setVoltagem(volt);

      setHistoricoVoltagem((historicoAntigo) => {
        const novoPonto = { voltagem: parseFloat(volt) };
        
        const novoHistorico = [...historicoAntigo, novoPonto];
        
        if (novoHistorico.length > 400) {
          novoHistorico.shift(); 
        }
        
        return novoHistorico;
      });
    });

    return () => {
      topicoBateria.unsubscribe();
    };
  }, [ros]);

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '10px' }}>
        <div className="data-value" style={{ color: '#00d66b', fontSize: '28px' }}>
          {voltagem} <span style={{ fontSize: '14px', color: '#888' }}>V</span>
        </div>
        <div className="data-value" style={{ color: '#aaa', fontSize: '16px', paddingBottom: '4px' }}>
          {bateria} <span style={{ fontSize: '12px', color: '#555' }}>%</span>
        </div>
      </div>

      <MiniChart data={historicoVoltagem} dataKey="voltagem" color="#00d66b" />
    </div>
  );
}

export default CardBateria;