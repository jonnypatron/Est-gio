import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function CardDadosIMU({ ros, isActive }) {
  const [velAngular, setVelAngular] = useState({ x: 0, y: 0, z: 0 });
  const [acelLinear, setAcelLinear] = useState({ x: 0, y: 0, z: 0 });

  // Referência silenciosa para a velocidade ALVO (Fantasma)
  const targetVelRef = useRef({ x: 0, y: 0, z: 0 });

  const [histVel, setHistVel] = useState([]);
  const [histAcel, setHistAcel] = useState([]);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    // 1. SUBSCREVER A REFERÊNCIA (VELOCIDADE ALVO)
    const targetTwistTopic = new window.ROSLIB.Topic({
      ros: ros,
      name: '/ref/twist',
      messageType: 'geometry_msgs/msg/Twist',
      throttle_rate: 50 
    });

    targetTwistTopic.subscribe((msg) => {
      if (!isActiveRef.current) return;
      if (msg && msg.angular) {
        // Guarda silenciosamente sem causar re-renderings
        targetVelRef.current = msg.angular;
      }
    });

    // 2. SUBSCREVER A IMU FÍSICA (REALIDADE)
    const topicoImu = new window.ROSLIB.Topic({
      ros: ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 150 
    });

    topicoImu.subscribe((msg) => {
      if (!isActiveRef.current) return;
      const vel = msg.angular_velocity;
      const acel = msg.linear_acceleration;

      if (!vel || !acel) return;

      setVelAngular(vel);
      setAcelLinear(acel);

      // 3. JUNTAR O REAL E O ALVO NO MESMO PONTO DE HISTÓRICO
      setHistVel((prev) => {
        const target = targetVelRef.current;
        // rx = Real X, tx = Target X
        const novoPonto = { 
          rx: vel.x, ry: vel.y, rz: vel.z,
          tx: target.x, ty: target.y, tz: target.z
        };
        const novo = [...prev, novoPonto];
        if (novo.length > 50) novo.shift(); 
        return novo;
      });

      setHistAcel((prev) => {
        const novoPonto = { x: acel.x, y: acel.y, z: acel.z };
        const novo = [...prev, novoPonto];
        if (novo.length > 50) novo.shift();
        return novo;
      });
    });

    return () => {
      topicoImu.unsubscribe();
      targetTwistTopic.unsubscribe(); // Limpar também o Target!
    };
  }, [ros]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, 
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, 
    },
    scales: {
      x: { display: false }, 
      y: {
        position: 'right',
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#666', font: { family: 'monospace', size: 8 }, maxTicksLimit: 5 },
      },
    },
    elements: {
      point: { radius: 0 }, 
      line: { tension: 0.2, borderWidth: 1.5 }, 
    },
  };

  // 4. DATASET DA VELOCIDADE (Com as linhas do Fantasma)
  const criarDatasetVel = (histData) => ({
    labels: histData.map((_, i) => i),
    datasets: [
      // LINHAS ALVO / FANTASMA (Desenhadas primeiro para ficarem no fundo)
      // Usamos opacidade a 40% (0.4) e tracejado (borderDash)
      { label: 'T-X', data: histData.map(d => d.tx), borderColor: 'rgba(255, 77, 77, 0.4)', borderDash: [4, 4] },
      { label: 'T-Y', data: histData.map(d => d.ty), borderColor: 'rgba(0, 214, 107, 0.4)', borderDash: [4, 4] },
      { label: 'T-Z', data: histData.map(d => d.tz), borderColor: 'rgba(52, 152, 219, 0.4)', borderDash: [4, 4] },
      
      // LINHAS REAIS (Desenhadas por cima, sólidas)
      { label: 'R-X', data: histData.map(d => d.rx), borderColor: '#ff4d4d' },
      { label: 'R-Y', data: histData.map(d => d.ry), borderColor: '#00d66b' },
      { label: 'R-Z', data: histData.map(d => d.rz), borderColor: '#3498db' },
    ],
  });

  // 5. DATASET DA ACELERAÇÃO (Mantém-se igual)
  const criarDatasetAcel = (histData) => ({
    labels: histData.map((_, i) => i),
    datasets: [
      { label: 'X', data: histData.map(d => d.x), borderColor: '#ff4d4d' },
      { label: 'Y', data: histData.map(d => d.y), borderColor: '#00d66b' },
      { label: 'Z', data: histData.map(d => d.z), borderColor: '#3498db' },
    ],
  });

  return (
    <div className="card imu-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <h2 style={{ display: 'none' }}>PHYSICAL DATA (IMU)</h2>

      <div className="imu-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="imu-header">
          <span className="imu-title">ANGULAR VELOCITY (RAD/S)</span>
          <div className="imu-values">
            <span style={{ color: '#ff4d4d' }}>X: {velAngular.x.toFixed(2)}</span>
            <span style={{ color: '#00d66b' }}>Y: {velAngular.y.toFixed(2)}</span>
            <span style={{ color: '#3498db' }}>Z: {velAngular.z.toFixed(2)}</span>
          </div>
        </div>
        
        <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {/* Agora usamos o criarDatasetVel */}
            {histVel.length > 0 && <Line options={options} data={criarDatasetVel(histVel)} />}
          </div>
        </div>
      </div>

      <div className="imu-divider" style={{ margin: '8px 0' }}></div>

      <div className="imu-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="imu-header">
          <span className="imu-title">LINEAR ACCELERATION (M/S²)</span>
          <div className="imu-values">
            <span style={{ color: '#ff4d4d' }}>X: {acelLinear.x.toFixed(2)}</span>
            <span style={{ color: '#00d66b' }}>Y: {acelLinear.y.toFixed(2)}</span>
            <span style={{ color: '#3498db' }}>Z: {acelLinear.z.toFixed(2)}</span>
          </div>
        </div>
        
        <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {/* Agora usamos o criarDatasetAcel */}
            {histAcel.length > 0 && <Line options={options} data={criarDatasetAcel(histAcel)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardDadosIMU;