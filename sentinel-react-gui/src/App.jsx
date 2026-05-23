import { useState, useEffect } from 'react';
import './index.css';

import PaginaTelemetria   from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao';
import PaginaControlo     from './PaginaControlo';

// ─── Configuração do robô ──────────────────────────────────────────────────────
//  Altera apenas aqui se o IP mudar — propaga para toda a app.
//
//  Ligações utilizadas:
//    ROSBRIDGE_URL  → ws://IP:9090  (ROSBridge — todos os dados ROS exceto vídeo)
//    VIDEO_WS_URL   → ws://IP:9092  (servidor C++ gui_image_streamer — só vídeo)
//
//  Nota: já NÃO existe a porta 9091. Era a segunda ligação ROSBridge para vídeo
//  que foi abandonada em favor do método direto na porta 9092.
const ROBOT_IP       = '192.168.31.14';
const ROSBRIDGE_URL  = `ws://${ROBOT_IP}:9090`;
const VIDEO_WS_URL   = `ws://${ROBOT_IP}:9092`;

function App() {
  const [status,      setStatus]      = useState('DISCONNECTED');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros,         setRos]         = useState(null);
  // rosVideo foi removido — o VideoStreamDisplay gere a sua própria ligação ws://IP:9092
  const [bateria,   setBateria]   = useState(0);
  const [pressao,   setPressao]   = useState('0.00');
  const [gz,        setGz]        = useState('1.00');
  const [abaAtiva,  setAbaAtiva]  = useState('telemetria');

  // ── LIGAÇÃO ROSBRIDGE (porta 9090) — telemetria, odometria, propulsores ──────
  //   Esta é a única ligação ROSBridge. O vídeo já não passa por aqui.
  useEffect(() => {
    const rosConn = new window.ROSLIB.Ros({ url: ROSBRIDGE_URL });

    rosConn.on('connection', () => {
      setStatus('CONNECTED!');
      setStatusColor('#00d66b');
      setRos(rosConn);

      // Bateria
      const batteryTopic = new window.ROSLIB.Topic({
        ros: rosConn,
        name: '/Battery',
        messageType: 'sensor_msgs/msg/BatteryState',
        throttle_rate: 200,
      });
      batteryTopic.subscribe((msg) => {
        if (msg && typeof msg.percentage !== 'undefined') setBateria(msg.percentage);
      });

      // IMU / aceleração vertical
      const imuTopic = new window.ROSLIB.Topic({
        ros: rosConn,
        name: '/imu_apps',
        messageType: 'sensor_msgs/msg/Imu',
        throttle_rate: 200,
      });
      imuTopic.subscribe((msg) => {
        if (msg?.linear_acceleration?.z !== undefined)
          setGz((msg.linear_acceleration.z / 9.81).toFixed(2));
      });

      // Pressão
      const pressaoTopic = new window.ROSLIB.Topic({
        ros: rosConn,
        name: '/adc/pressure',
        messageType: 'std_msgs/msg/Float32',
        throttle_rate: 200,
      });
      pressaoTopic.subscribe((msg) => {
        if (msg && typeof msg.data !== 'undefined') setPressao(msg.data.toFixed(2));
      });
    });

    rosConn.on('error', () => {
      setStatus('ERRO');
      setStatusColor('#ff4d4d');
    });

    rosConn.on('close', () => {
      setStatus('OFFLINE');
      setStatusColor('#888888');
      setRos(null);
    });
  }, []);

  // ── Sem segundo useEffect de vídeo! ───────────────────────────────────────────
  //  O VideoStreamDisplay (dentro de PaginaVisualizacao) cria e gere a sua própria
  //  ligação WebSocket para ws://IP:9092 de forma completamente autónoma.
  //  O App.jsx só precisa de passar a URL como string.

  const estiloVisivel   = { display: 'block',    height: '100%', width: '100%' };
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
          >CONTROL</button>
          <button
            className={`nav-link ${abaAtiva === 'visualizacao' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('visualizacao')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >VISUALIZATION</button>
          <button
            className={`nav-link ${abaAtiva === 'telemetria' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('telemetria')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >TELEMETRY</button>
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
                width: `${Math.min(bateria * 100, 100)}%`,
                backgroundColor: bateria > 0.2 ? '#00d66b' : '#ff4d4d',
              }} />
            </div>
          </div>
        </div>
      </header>

      <main className="content-area" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={abaAtiva === 'telemetria'   ? estiloVisivel : estiloEscondido}>
          <PaginaTelemetria ros={ros} isActive={abaAtiva === 'telemetria'} />
        </div>

        <div style={abaAtiva === 'visualizacao' ? estiloVisivel : estiloEscondido}>
          {/*
            videoWsUrl é a única prop nova.
            Passa a URL do servidor C++ de vídeo — sem ROSBridge, sem rosVideo.
            O VideoStreamDisplay dentro de PaginaVisualizacao gere tudo de forma autónoma.
          */}
          <PaginaVisualizacao
            ros={ros}
            videoWsUrl={VIDEO_WS_URL}
            isActive={abaAtiva === 'visualizacao'}
          />
        </div>

        <div style={abaAtiva === 'controlo'     ? estiloVisivel : estiloEscondido}>
          <PaginaControlo ros={ros} isActive={abaAtiva === 'controlo'} />
        </div>
      </main>
    </div>
  );
}

export default App;
