import { useState, useEffect } from 'react';
// ⚠️ IMPORT DO ROSLIB APAGADO DAQUI!
import './index.css';

import PaginaTelemetria from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao';
import PaginaControlo from './PaginaControlo';

function App() {
  const [status, setStatus] = useState('DESCONECTADO');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros, setRos] = useState(null);
  const [bateria, setBateria] = useState(0);
  
  const [abaAtiva, setAbaAtiva] = useState('telemetria');

  useEffect(() => {
    // Agora usa o window.ROSLIB que vem do index.html
    const rosConnection = new window.ROSLIB.Ros({ url: 'ws://10.0.2.2:9090' });

    rosConnection.on('connection', () => {
      setStatus('LIGADO!');
      setStatusColor('#00d66b');
      setRos(rosConnection);

      const batteryTopic = new window.ROSLIB.Topic({
        ros: rosConnection,
        name: '/Battery',
        messageType: 'sensor_msgs/msg/BatteryState'
      });
      
      batteryTopic.subscribe((msg) => {
        // Escudo básico para a bateria também
        if (msg && typeof msg.percentage !== 'undefined') {
          setBateria(msg.percentage);
        }
      });
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

  // ESTILOS DE ESCONDERIJO QUE NÃO PARTEM OS GRÁFICOS
  const estiloVisivel = { display: 'block', height: '100%', width: '100%' };
  const estiloEscondido = { position: 'absolute', top: '-9999px', left: '-9999px', visibility: 'hidden' };

  return (
    <div className="app-wrapper">
      <header className="mission-header">
        <div className="header-left"></div>

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

      <main className="content-area" style={{ position: 'relative', overflow: 'hidden' }}>
        
        {/* A aplicação dos novos estilos em vez do simples display: none */}
        <div style={abaAtiva === 'telemetria' ? estiloVisivel : estiloEscondido}>
          <PaginaTelemetria ros={ros} />
        </div>

        <div style={abaAtiva === 'visualizacao' ? estiloVisivel : estiloEscondido}>
          <PaginaVisualizacao ros={ros} />
        </div>

        <div style={abaAtiva === 'controlo' ? estiloVisivel : estiloEscondido}>
          <PaginaControlo ros={ros} />
        </div>
      </main>
    </div>
  );
}

export default App;