import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';
import './index.css';
import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores'; 
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG';

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
    <div>
      <h1 style={{ paddingTop: '30px' }}>Sentinel GUI</h1>
      <h2 style={{ color: statusColor }}>{status}</h2>

      <div className="container">
        {ros && <CardBateria ros={ros} />}
        {ros && <CardAmbiente ros={ros} />}
      </div>

      <div className="container">
        {ros && <CardPropulsores ros={ros} />}
      </div>

      <div className="container">
        {ros && <CardDadosIMU ros={ros} />}
        {ros && <CardForcaG ros={ros} />}
      </div>
    </div>
  );
}

export default App;