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
  const chartRef  = useRef(null);
  const [chartData, setChartData] = useState({ datasets: [], labels: [] });

  useEffect(() => {
    // Proteção: dados insuficientes ou canvas ainda não montado
    if (!data || data.length < 2 || !chartRef.current) return;

    const chart = chartRef.current;

    // Extrai os valores e cria os labels de índice
    const values = data.map(item => item[dataKey]);
    const labels = data.map((_, i) => i);

    // Gradiente nativo do canvas para o efeito de área preenchida
    const ctx      = chart.canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, chart.canvas.height);
    gradient.addColorStop(0, `${color}4D`);  // cor a 30% de opacidade no topo
    gradient.addColorStop(1, `${color}00`);  // transparente na base

    setChartData({
      labels,
      datasets: [{
        data: values,
        borderColor:     color,
        borderWidth:     1.5,
        backgroundColor: gradient,
        fill:            true,
        pointRadius:     0,
        tension:         0.3,
      }]
    });
  }, [data, dataKey, color]);

  // ── Domínio adaptativo do eixo Y ─────────────────────────────────────────────
  // OTIMIZAÇÃO: Math.min(...array) e Math.max(...array) usam spread, que cria
  // uma lista de argumentos em memória. Com 400 pontos a cada render (900 ms
  // de throttle na bateria), isso gera pressão desnecessária no GC num mobile.
  // Um único reduce percorre o array uma vez e calcula os dois extremos sem
  // nenhuma alocação extra.
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i][dataKey];
    if (v < minY) minY = v;
    if (v > maxY) maxY = v;
  }
  if (data.length === 0) { minY = 0; maxY = 0; }

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    animation:           false,
    plugins: {
      legend:  { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: {
        display:      false,
        suggestedMin: minY - 0.2,
        suggestedMax: maxY + 0.2,
      }
    },
    layout: { padding: 0 }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100px', marginTop: '10px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Line
          ref={chartRef}
          options={options}
          data={chartData.datasets.length ? chartData : { labels: [], datasets: [] }}
        />
      </div>
    </div>
  );
}

export default MiniChart;