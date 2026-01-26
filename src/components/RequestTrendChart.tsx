import React from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface RequestTrendChartProps {
    data: any[];
}

const RequestTrendChart: React.FC<RequestTrendChartProps> = ({ data = [] }) => {
  // Transform data if needed, or assume parent passed correct format
  // Backend returns: { time: "2023-10-27 14", request_count: 10, total_tokens: 100 }
  // We want to show request_count or tokens? Let's show request_count for now.
  
  const chartData = data.map(item => {
      // Backend returns "YYYY-MM-DD HH"
      const timeStr = item.time || "";
      const hour = timeStr.length >= 13 ? timeStr.substring(11, 13) : timeStr;
      return {
          name: `${hour}:00`,
          value: item.request_count
      };
  });

  // If no data, show placeholder
  const displayData = chartData.length > 0 ? chartData : [
      { name: '00:00', value: 0 },
      { name: '04:00', value: 0 },
      { name: '08:00', value: 0 },
      { name: '12:00', value: 0 },
      { name: '16:00', value: 0 },
      { name: '20:00', value: 0 },
  ];

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <AreaChart data={displayData}>
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
          <XAxis dataKey="name" hide />
          <Area type="monotone" dataKey="value" stroke="#137fec" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between mt-2 px-2 text-xs text-slate-500 font-mono">
        {displayData.filter((_, i) => i % 4 === 0).map((item, i) => (
            <span key={i}>{item.name}</span>
        ))}
      </div>
    </div>
  );
};

export default RequestTrendChart;
