import { useState, useEffect } from 'react';

import { ResponsiveContainer, LineChart, Line, YAxis, CartesianGrid } from 'recharts';

function CardDadosIMU({ ros }) {
  const [velAngular, setVelAngular] = useState({ x: 0, y: 0, z: 0 });
  const [acelLinear, setAcelLinear] = useState({ x: 0, y: 0, z: 0 });

  const [histVel, setHistVel] = useState([]);
  const [histAcel, setHistAcel] = useState([]);

  useEffect(() => {
    if (!ros) return;

    // 1. Throttle a 150ms (~6.6 Hz). Suaviza os números e a velocidade da linha.
    const topicoImu = new window.ROSLIB.Topic({
      ros: ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 150 
    });

    topicoImu.subscribe((msg) => {
      const vel = msg.angular_velocity;
      const acel = msg.linear_acceleration;

      if (!vel || !acel) return;

      setVelAngular(vel);
      setAcelLinear(acel);

      // 2. Aumentámos para 60 pontos. (60 * 150ms = 9 segundos de janela de visualização)
      setHistVel((prev) => {
        const novo = [...prev, { x: vel.x, y: vel.y, z: vel.z }];
        if (novo.length > 60) novo.shift();
        return novo;
      });

      setHistAcel((prev) => {
        const novo = [...prev, { x: acel.x, y: acel.y, z: acel.z }];
        if (novo.length > 60) novo.shift();
        return novo;
      });
    });

    return () => {
      topicoImu.unsubscribe();
    };
  }, [ros]);

  const ImuChart = ({ data }) => (
    // flex: 1 obriga o gráfico a empurrar-se para preencher todo o vazio vertical
    <div style={{ flex: 1, width: '100%', minHeight: '50px', marginTop: '5px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="2 2" stroke="#222" vertical={false} />
          
          {/* 3. Eixo Y Minimalista, encostado à direita para não empurrar os gráficos */}
          <YAxis 
            domain={['auto', 'auto']} 
            width={22} 
            orientation="right"
            tick={{ fontSize: 8, fill: '#666', fontFamily: 'monospace' }} 
            tickLine={false} 
            axisLine={false} 
          />
          
          <Line type="monotone" dataKey="x" stroke="#ff4d4d" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="y" stroke="#00d66b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z" stroke="#3498db" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="card imu-card">
      {/* Escondemos o título principal para poupar espaço em mobile, mantendo apenas os títulos de secção */}
      <h2 style={{ display: 'none' }}>DADOS FÍSICOS (IMU)</h2>

      <div className="imu-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="imu-header">
          <span className="imu-title">VEL. ANGULAR (RAD/S)</span>
          <div className="imu-values">
            <span style={{ color: '#ff4d4d' }}>X: {velAngular.x.toFixed(2)}</span>
            <span style={{ color: '#00d66b' }}>Y: {velAngular.y.toFixed(2)}</span>
            <span style={{ color: '#3498db' }}>Z: {velAngular.z.toFixed(2)}</span>
          </div>
        </div>
        <ImuChart data={histVel} />
      </div>

      <div className="imu-divider" style={{ margin: '8px 0' }}></div>

      <div className="imu-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="imu-header">
          <span className="imu-title">ACEL. LINEAR (M/S²)</span>
          <div className="imu-values">
            <span style={{ color: '#ff4d4d' }}>X: {acelLinear.x.toFixed(2)}</span>
            <span style={{ color: '#00d66b' }}>Y: {acelLinear.y.toFixed(2)}</span>
            <span style={{ color: '#3498db' }}>Z: {acelLinear.z.toFixed(2)}</span>
          </div>
        </div>
        <ImuChart data={histAcel} />
      </div>

    </div>
  );
}

export default CardDadosIMU;