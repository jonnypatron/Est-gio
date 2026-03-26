import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';
import MiniChart from './MiniChart'; // Importamos a nossa nova "ferramenta" de desenho

function CardBateria({ ros }) {
  const [bateria, setBateria] = useState('--');
  const [voltagem, setVoltagem] = useState('--');
  
  // NOVO: Array para guardar o histórico do gráfico
  const [historicoVoltagem, setHistoricoVoltagem] = useState([]);

  useEffect(() => {
    if (!ros) return;

    const topicoBateria = new ROSLIB.Topic({
      ros: ros,
      name: '/Battery',
      messageType: 'sensor_msgs/msg/BatteryState'
    });

    topicoBateria.subscribe((mensagem) => {
      const perc = (mensagem.percentage * 100).toFixed(0);
      const volt = mensagem.voltage.toFixed(2);
      
      setBateria(perc);
      setVoltagem(volt);

      // NOVO: A magia de guardar o histórico!
      setHistoricoVoltagem((historicoAntigo) => {
        // Criamos um novo ponto com a voltagem atual
        const novoPonto = { voltagem: parseFloat(volt) };
        
        // Juntamos o ponto novo ao histórico antigo
        const novoHistorico = [...historicoAntigo, novoPonto];
        
        // Se a lista passar de 50 pontos, apagamos o mais antigo (shift)
        // Isto impede que a memória do Raspberry Pi encha!
        if (novoHistorico.length > 50) {
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
      {/* Título com Legenda do Gráfico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Battery Status</h2>
        <span style={{ fontSize: '10px', color: '#00d66b', fontWeight: 'bold' }}>— Voltage</span>
      </div>
      
      {/* Valores principais em destaque */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '10px' }}>
        <div className="data-value" style={{ color: '#00d66b', fontSize: '28px' }}>
          {voltagem} <span style={{ fontSize: '14px', color: '#888' }}>V</span>
        </div>
        <div className="data-value" style={{ color: '#aaa', fontSize: '16px', paddingBottom: '4px' }}>
          {bateria} <span style={{ fontSize: '12px', color: '#555' }}>%</span>
        </div>
      </div>

      {/* O Gráfico a receber a nossa "lista" de valores */}
      <MiniChart data={historicoVoltagem} dataKey="voltagem" color="#00d66b" />
    </div>
  );
}

export default CardBateria;