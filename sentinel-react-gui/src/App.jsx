import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';
import './index.css';

import PaginaTelemetria from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao';
import PaginaControlo from './PaginaControlo';

function App() {
  const [status, setStatus] = useState('DESCONECTADO');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros, setRos] = useState(null);
  const [bateria, setBateria] = useState(0);
  
  // NOVO: Gerir a aba ativa manualmente em vez de usar o react-router
  const [abaAtiva, setAbaAtiva] = useState('telemetria');

  useEffect(() => {
    const rosConnection = new ROSLIB.Ros({ url: 'ws://10.0.2.2:9090' });

    rosConnection.on('connection', () => {
      setStatus('LIGADO!');
      setStatusColor('#00d66b');
      setRos(rosConnection);

      const batteryTopic = new ROSLIB.Topic({
        ros: rosConnection,
        name: '/Battery',
        messageType: 'sensor_msgs/msg/BatteryState'
      });
      batteryTopic.subscribe((msg) => setBateria(msg.percentage));
    });

    rosConnection.on('error', () => {
      setStatus('ERRO');
      setStatusColor('#ff4d4d');
    });

    rosConnection.on('close', () => {
      setStatus('OFFLINE');
      setStatusColor('#888888');
      setRos(null);
    });
  }, []);

  return (
    <div className="app-wrapper">
      <header className="mission-header">
        <div className="header-left"></div>

        {/* NOVA: Navegação baseada em botões e estado (Sem NavLink) */}
        <nav className="header-center navbar">
          <button 
            className={`nav-link ${abaAtiva === 'controlo' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('controlo')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            CONTROLO
          </button>
          <button 
            className={`nav-link ${abaAtiva === 'visualizacao' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('visualizacao')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            VISUALIZAÇÃO
          </button>
          <button 
            className={`nav-link ${abaAtiva === 'telemetria' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('telemetria')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            TELEMETRIA
          </button>
        </nav>

        <div className="header-right">
          <div className="status-zone">
            <div className="status-led" style={{ backgroundColor: statusColor }}></div>
            <span className="status-text" style={{ color: statusColor }}>{status}</span>
          </div>

          <div className="battery-zone">
            <span className="battery-text">{(bateria * 100).toFixed(0)}%</span>
            <div className="battery-icon">
              <div className="battery-level" style={{ 
                width: `${bateria * 100}%`, 
                backgroundColor: bateria > 0.2 ? '#00d66b' : '#ff4d4d' 
              }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* NOVO: A magia do "Esconderijo" (Off-screen rendering) */}
      <main className="content-area">
        
        {/* As três páginas estão sempre lá, mas só uma é visível! */}
        <div style={{ display: abaAtiva === 'telemetria' ? 'block' : 'none', height: '100%' }}>
          <PaginaTelemetria ros={ros} />
        </div>

        <div style={{ display: abaAtiva === 'visualizacao' ? 'block' : 'none', height: '100%' }}>
          <PaginaVisualizacao ros={ros} />
        </div>

        <div style={{ display: abaAtiva === 'controlo' ? 'block' : 'none', height: '100%' }}>
          <PaginaControlo ros={ros} />
        </div>
      </main>
    </div>
  );
}

export default App;