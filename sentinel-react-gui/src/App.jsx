import { useState, useEffect, useRef } from 'react';
import './index.css';

import PaginaTelemetria from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao';
import PaginaControlo from './PaginaControlo';

function App() {
  const [status, setStatus] = useState('DISCONNECTED');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros, setRos] = useState(null);
  const [bateria, setBateria] = useState(0);

  const [pressao, setPressao] = useState('0.00');
  const [gz, setGz] = useState('1.00');
  
  const [abaAtiva, setAbaAtiva] = useState('telemetria');

  useEffect(() => {
    const rosConnection = new window.ROSLIB.Ros({ url: 'ws://172.20.10.4:9090' });

    rosConnection.on('connection', () => {
      setStatus('CONNECTED!');
      setStatusColor('#00d66b');
      setRos(rosConnection);

      const batteryTopic = new window.ROSLIB.Topic({
        ros: rosConnection,
        name: '/Battery',
        messageType: 'sensor_msgs/msg/BatteryState',
        throttle_rate: 200
      });
      
      batteryTopic.subscribe((msg) => {
        if (msg && typeof msg.percentage !== 'undefined') {
          setBateria(msg.percentage);
        }
      });

      const imuTopic = new window.ROSLIB.Topic({ ros: rosConnection, name: '/imu_apps', messageType: 'sensor_msgs/msg/Imu', throttle_rate: 200 });
      imuTopic.subscribe((msg) => {
        // ESCUDO: Verifica se a aceleração existe E se o Z é um número
        if (msg && msg.linear_acceleration && typeof msg.linear_acceleration.z !== 'undefined') {
          setGz((msg.linear_acceleration.z / 9.81).toFixed(2));
        }
      });

      const pressaoTopic = new window.ROSLIB.Topic({ ros: rosConnection, name: '/adc/pressure', messageType: 'std_msgs/msg/Float32', throttle_rate: 200 });
      pressaoTopic.subscribe((msg) => {
        // ESCUDO: Verifica se o data existe antes de usar o toFixed
        if (msg && typeof msg.data !== 'undefined') {
           setPressao(msg.data.toFixed(2));
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

  const estiloVisivel = { display: 'block', height: '100%', width: '100%' };
  const estiloEscondido = { position: 'absolute', top: '-9999px', left: '-9999px', visibility: 'hidden' };

  return (
    <div className="app-wrapper">
      <header className="mission-header">
        <div className="header-left" style={{ display: 'flex', gap: '15px', paddingLeft: '10px', fontSize: '14px', fontWeight: 'bold', color: '#3498db' }}>
          <span>{pressao} BAR</span>
          <span>{gz} Gz</span>
        </div>

        <nav className="header-center navbar">
          <button 
            className={`nav-link ${abaAtiva === 'controlo' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('controlo')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            CONTROL
          </button>
          <button 
            className={`nav-link ${abaAtiva === 'visualizacao' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('visualizacao')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            VISUALIZATION
          </button>
          <button 
            className={`nav-link ${abaAtiva === 'telemetria' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('telemetria')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            TELEMETRY
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
        
        <div style={abaAtiva === 'telemetria' ? estiloVisivel : estiloEscondido}>
          <PaginaTelemetria ros={ros} isActive={abaAtiva === 'telemetria'} />
        </div>

        <div style={abaAtiva === 'visualizacao' ? estiloVisivel : estiloEscondido}>
          <PaginaVisualizacao ros={ros} isActive={abaAtiva === 'visualizacao'} />
        </div>

        <div style={abaAtiva === 'controlo' ? estiloVisivel : estiloEscondido}>
          <PaginaControlo ros={ros} isActive={abaAtiva === 'controlo'} />
        </div>
      </main>
    </div>
  );
}

export default App;