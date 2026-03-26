import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import * as ROSLIB from 'roslib';
import './index.css';

import PaginaTelemetria from './PaginaTelemetria';
// import PaginaControlo from './PaginaControlo';    
import PaginaVisualizacao from './PaginaVisualizacao'; 

function App() {
  const [status, setStatus] = useState('A aguardar ligação...');
  const [statusColor, setStatusColor] = useState('yellow');
  const [ros, setRos] = useState(null);

  useEffect(() => {
    const rosConnection = new ROSLIB.Ros({
      url: 'ws://localhost:9090'
    });

    rosConnection.on('connection', () => {
      setStatus('Ligado ao Sentinel!');
      setStatusColor('#00d66b');
      setRos(rosConnection);
    });

    rosConnection.on('error', () => {
      setStatus('Sentinel não Encontrado!');
      setStatusColor('#ff4d4d');
    });

    rosConnection.on('close', () => {
      setStatus('Ligação Encerrada!');
      setStatusColor('#888888');
      setRos(null);
    });
  }, []);

  return (
    <BrowserRouter>
      <div>
        <h1 style={{ paddingTop: '30px' }}>Sentinel GUI</h1>
        <h2 style={{ color: statusColor }}>{status}</h2>

        <nav className="navbar">
          <NavLink to="/controlo" className="nav-link">CONTROLO</NavLink>
          <NavLink to="/visualizacao" className="nav-link">VISUALIZAÇÃO</NavLink>
          <NavLink to="/" className="nav-link">TELEMETRIA</NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<PaginaTelemetria ros={ros} />} />
          
          {/* <Route path="/controlo" element={<PaginaControlo ros={ros} />} /> */}
          <Route path="/visualizacao" element={<PaginaVisualizacao ros={ros} />} />
        </Routes>
        
      </div>
    </BrowserRouter>
  );
}

export default App;