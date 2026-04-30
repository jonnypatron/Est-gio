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

// Registar os módulos do Chart.js
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

  // 1. VOLTAMOS A USAR UM SIMPLES ARRAY DE OBJETOS (Formato clássico)
  const [histVel, setHistVel] = useState([]);
  const [histAcel, setHistAcel] = useState([]);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!ros) return;

    const topicoImu = new window.ROSLIB.Topic({
      ros: ros,
      name: '/imu_apps',
      messageType: 'sensor_msgs/msg/Imu',
      throttle_rate: 150 // Mantemos o throttle para performance
    });

    topicoImu.subscribe((msg) => {
      if (!isActiveRef.current) return;
      const vel = msg.angular_velocity;
      const acel = msg.linear_acceleration;

      if (!vel || !acel) return;

      setVelAngular(vel);
      setAcelLinear(acel);

      // 2. ATUALIZAMOS O HISTÓRICO EMPURRANDO UM OBJETO SIMPLES
      setHistVel((prev) => {
        const novoPonto = { x: vel.x, y: vel.y, z: vel.z };
        const novo = [...prev, novoPonto];
        if (novo.length > 50) novo.shift(); // 50 pontos para fluidez
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
    };
  }, [ros]);

  // 3. CONFIGURAÇÕES GLOBAIS DO GRÁFICO (Mantemos as otimizações visuais)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // CRÍTICO: Desligar animações para real-time!
    // REMOVEMOS: parsing: false. Vamos deixar o ChartJS fazer o parsing, é mais lento mas é INFALÍVEL.
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, 
    },
    scales: {
      x: { display: false }, // Esconde o eixo do tempo
      y: {
        position: 'right',
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#666', font: { family: 'monospace', size: 8 }, maxTicksLimit: 5 },
      },
    },
    elements: {
      point: { radius: 0 }, // Não desenhar bolinhas pesadas
      line: { tension: 0.2, borderWidth: 1.5 }, // Suaviza um pouco ( tension maior alivia cálculos de curvas)
    },
  };

  // 4. CRIAR DATASET: Convertemos o array de objetos no formato que o LineChart precisa
  const criarDataset = (histData) => ({
    // Geramos as labels automáticas baseadas no índice
    labels: histData.map((_, i) => i),
    datasets: [
      { label: 'X', data: histData.map(d => d.x), borderColor: '#ff4d4d' },
      { label: 'Y', data: histData.map(d => d.y), borderColor: '#00d66b' },
      { label: 'Z', data: histData.map(d => d.z), borderColor: '#3498db' },
    ],
  });

  // O RETURN MANTÉM TODAS AS CORREÇÕES DE LAYOUT ANTERIORES
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
        
        {/* A JAULA À PROVA DE BALA */}
        <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {histVel.length > 0 && <Line options={options} data={criarDataset(histVel)} />}
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
        
        {/* A JAULA À PROVA DE BALA */}
        <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {histAcel.length > 0 && <Line options={options} data={criarDataset(histAcel)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardDadosIMU;