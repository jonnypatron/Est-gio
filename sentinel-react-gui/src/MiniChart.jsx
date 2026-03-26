import { ResponsiveContainer, AreaChart, Area, YAxis, CartesianGrid } from 'recharts';

function MiniChart({ data, dataKey, color = "#00d66b" }) {
  return (
    <div style={{ width: '100%', height: 100, marginTop: '10px' }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} hide />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fillOpacity={1} 
            fill={`url(#color${dataKey})`} 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default MiniChart;