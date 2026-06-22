import { useState, useEffect } from 'react';
import './index.css';

import PaginaTelemetria   from './PaginaTelemetria';
import PaginaVisualizacao from './PaginaVisualizacao';
import PaginaControlo     from './PaginaControlo';

//    ROSBRIDGE_URL  → ws://IP:9091   (telemetria/controlo — PC do supervisor)
//    VIDEO_WS_URL   → ws://IP:9092   (stream de vídeo — IP do próprio robô)
//
const ROBOT_IP = '172.20.10.14';

// IP por defeito da ROSBridge (PC do supervisor). Pode ser alterado em runtime
// no menu de Definições (⚙) — fica guardado em localStorage, sem recompilar o APK.
const DEFAULT_ROSBRIDGE_IP = '192.168.8.12';

// O vídeo é o IP do próprio robô e não muda quando o IP do PC do supervisor muda,
// por isso fica como constante (não está no menu de definições).
const VIDEO_WS_URL = 'ws://192.168.8.1:9092';

// pc Coutinho: 192.168.8.11
// net esposende wsl: 172.26.128.78
// net esposende windows: 192.168.31.14

function App() {
  const [status,      setStatus]      = useState('DISCONNECTED');
  const [statusColor, setStatusColor] = useState('#ff4d4d');
  const [ros,         setRos]         = useState(null);

  const [bateria,   setBateria]   = useState(0);
  const [pressao,   setPressao]   = useState('0.00');
  const [gz,        setGz]        = useState('1.00');
  const [abaAtiva,  setAbaAtiva]  = useState('telemetria');

  // ── IP da ROSBridge (editável em runtime) ───────────────────────────────────
  const [rosbridgeIp, setRosbridgeIp] = useState(
    () => localStorage.getItem('rosbridge_ip') || DEFAULT_ROSBRIDGE_IP
  );
  const [showSettings, setShowSettings] = useState(false);
  const [ipDraft,      setIpDraft]      = useState(rosbridgeIp);

  const ROSBRIDGE_URL = `ws://${rosbridgeIp}:9090`;

  // ── LIGAÇÃO ROSBRIDGE (porta 9090) — telemetria, odometria, propulsores ──────
  //   Depende de rosbridgeIp: ao mudar o IP no menu, a ligação antiga fecha-se
  //   e abre-se uma nova automaticamente — sem reiniciar o APK.
  useEffect(() => {
    setStatus('CONNECTING…');
    setStatusColor('#ffd84a');

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

    // Cleanup: ao mudar o IP (ou desmontar), fecha a ligação antiga.
    return () => {
      try { rosConn.close(); } catch (_) {}
    };
  }, [ROSBRIDGE_URL]);

  // ── Guardar novo IP ──────────────────────────────────────────────────────────
  const handleSaveIp = () => {
    const novo = ipDraft.trim();
    if (!novo) return;
    localStorage.setItem('rosbridge_ip', novo);
    setRosbridgeIp(novo);   // dispara reconexão automática
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setIpDraft(rosbridgeIp);
    setShowSettings(true);
  };

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

          {/* Botão de definições (⚙) — abre o menu para mudar o IP da ROSBridge */}
          <button
            className="settings-btn"
            onClick={handleOpenSettings}
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ── Menu de Definições ──────────────────────────────────────────────── */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="settings-title">CONNECTION SETTINGS</h3>

            <label className="settings-label">ROSBridge IP (supervisor PC)</label>
            <input
              className="settings-input"
              type="text"
              inputMode="decimal"
              value={ipDraft}
              onChange={(e) => setIpDraft(e.target.value)}
              placeholder="192.168.31.14"
              autoFocus
            />
            <p className="settings-hint">Will connect to ws://{ipDraft || '…'}:9090</p>

            <div className="settings-actions">
              <button className="settings-cancel" onClick={() => setShowSettings(false)}>
                CANCEL
              </button>
              <button className="settings-save" onClick={handleSaveIp}>
                SAVE &amp; RECONNECT
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="content-area" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={abaAtiva === 'telemetria'   ? estiloVisivel : estiloEscondido}>
          <PaginaTelemetria ros={ros} isActive={abaAtiva === 'telemetria'} />
        </div>

        <div style={abaAtiva === 'visualizacao' ? estiloVisivel : estiloEscondido}>
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