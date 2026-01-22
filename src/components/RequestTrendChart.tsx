import React from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '00:00', value: 20 },
  { name: '02:00', value: 50 },
  { name: '04:00', value: 30 },
  { name: '06:00', value: 80 },
  { name: '08:00', value: 100 },
  { name: '10:00', value: 70 },
  { name: '12:00', value: 110 },
  { name: '14:00', value: 90 },
  { name: '16:00', value: 130 },
  { name: '18:00', value: 80 },
  { name: '20:00', value: 120 },
  { name: 'Now', value: 60 },
];

const RequestTrendChart: React.FC = () => {
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#137fec" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#137fec" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ backgroundColor: '#111a22', borderColor: '#334155', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area type="monotone" dataKey="value" stroke="#137fec" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between mt-2 px-2 text-xs text-slate-500 font-mono">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span>Now</span>
      </div>
    </div>
  );
};

export default RequestTrendChart;
