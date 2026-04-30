import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

function MiniChart({ data, dataKey, color = "#00d66b" }) {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState({ datasets: [], labels: [] });

  useEffect(() => {
    // PROTEÇÃO: Se não houver dados suficientes, não faz nada
    if (!data || data.length < 2 || !chartRef.current) return;

    const chart = chartRef.current;

    // 1. EXTRAÍMOS OS VALORES BRUTOS (Map é lento mas seguro)
    const values = data.map(item => item[dataKey]);
    const labels = data.map((_, i) => i); 

    // 2. CRIAR O GRADIENTE (Nativo do Canvas)
    const ctx = chart.canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, chart.canvas.height);
    // Usamos cor com 30% de opacidade HEX (4D) descendo para 0% (00)
    gradient.addColorStop(0, `${color}4D`); 
    gradient.addColorStop(1, `${color}00`);

    setChartData({
      labels: labels,
      datasets: [
        {
          data: values,
          borderColor: color,
          borderWidth: 1.5,
          backgroundColor: gradient,
          fill: true, // Efeito AreaChart
          pointRadius: 0,
          tension: 0.3, // Um pouco mais suave que o IMU
        }
      ]
    });
  }, [data, dataKey, color]);

  const valoresY = data.length > 0 ? data.map(d => d[dataKey]) : [0];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, 
    // REMOVEMOS: parsing: false para compatibilidade total
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: {
        display: false, // Escondido
        // Domain adaptativo
        suggestedMin: Math.min(...valoresY) - 0.2,
        suggestedMax: Math.max(...valoresY) + 0.2,
      }
    },
    layout: { padding: 0 }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100px', marginTop: '10px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Tirámos a condição! Renderiza logo, mesmo vazio. */}
        <Line ref={chartRef} options={options} data={chartData.datasets.length ? chartData : { labels: [], datasets: [] }} />
      </div>
    </div>
  );
}

export default MiniChart;