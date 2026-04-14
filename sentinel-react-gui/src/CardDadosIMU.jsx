import { useState, useEffect, useRef } from 'react';
import * as ROSLIB from 'roslib';
import { ResponsiveContainer, LineChart, Line, YAxis, CartesianGrid } from 'recharts';

function CardDadosIMU({ ros }) {
  const [velAngular, setVelAngular] = useState({ x: 0, y: 0, z: 0 });
  const [acelLinear, setAcelLinear] = useState({ x: 0, y: 0, z: 0 });

  const [histVel, setHistVel] = useState([]);
  const [histAcel, setHistAcel] = useState([]);

  useEffect(() => {
    if (!ros) return;

      const topicoImu = new ROSLIB.Topic({
        ros: ros,
        name: '/imu_apps',
        messageType: 'sensor_msgs/msg/Imu',
        throttle_rate: 50
      });

      topicoImu.subscribe((msg) => {
      // 1. Vamos buscar os dados aos caminhos exatos do manual ROS que enviaste!
        const vel = msg.angular_velocity;
        const acel = msg.linear_acceleration;

        // 2. O cinto de segurança (Se a msg vier vazia num frame, ignoramos)
        if (!vel || !acel) return;

        setVelAngular(vel);
        setAcelLinear(acel);

      // 3. Atualizar os gráficos
        setHistVel((prev) => {
          const novo = [...prev, { x: vel.x, y: vel.y, z: vel.z }];
          if (novo.length > 50) novo.shift();
          return novo;
        });

        setHistAcel((prev) => {
          const novo = [...prev, { x: acel.x, y: acel.y, z: acel.z }];
          if (novo.length > 50) novo.shift();
          return novo;
        });
    });

    return () => {
      topicoImu.unsubscribe();
    };
  }, [ros]);

  const ImuChart = ({ data }) => (
    <div style={{ width: '100%', height: '80px', marginTop: '5px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="2 2" stroke="#222" vertical={false} />
          <YAxis domain={['auto', 'auto']} hide />
          <Line type="monotone" dataKey="x" stroke="#ff4d4d" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="y" stroke="#00d66b" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z" stroke="#3498db" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="card imu-card">
      <h2>DADOS FÍSICOS (IMU)</h2>

      <div className="imu-section">
        <div className="imu-header">
          <span className="imu-title">Vel. Angular (rad/s)</span>
          <div className="imu-values">
            <span style={{ color: '#ff4d4d' }}>X: {velAngular.x.toFixed(2)}</span>
            <span style={{ color: '#00d66b' }}>Y: {velAngular.y.toFixed(2)}</span>
            <span style={{ color: '#3498db' }}>Z: {velAngular.z.toFixed(2)}</span>
          </div>
        </div>
        <ImuChart data={histVel} />
      </div>

      <div className="imu-divider"></div>

      <div className="imu-section">
        <div className="imu-header">
          <span className="imu-title">Acel. Linear (m/s²)</span>
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