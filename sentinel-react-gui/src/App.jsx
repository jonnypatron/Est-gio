import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import * as ROSLIB from 'roslib';
import './index.css';

import PaginaTelemetria from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao'; 

function App() {
  const [status, setStatus] = useState('DESCONECTADO');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros, setRos] = useState(null);
  const [bateria, setBateria] = useState(0);

  useEffect(() => {
    const rosConnection = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

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
    <BrowserRouter>
      <div className="app-wrapper">
        <header className="mission-header">
          <div className="header-left"></div>

          <nav className="header-center navbar">
            <NavLink to="/controlo" className="nav-link">CONTROLO</NavLink>
            <NavLink to="/visualizacao" className="nav-link">VISUALIZAÇÃO</NavLink>
            <NavLink to="/" className="nav-link">TELEMETRIA</NavLink>
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

        <main className="content-area">
          <Routes>
            <Route path="/" element={<PaginaTelemetria ros={ros} />} />
            <Route path="/visualizacao" element={<PaginaVisualizacao ros={ros} />} />
            <Route path="/controlo" element={<div className="card">Controlo</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;