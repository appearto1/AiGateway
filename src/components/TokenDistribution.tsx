import React from 'react';
import { Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

const TokenDistribution: React.FC = () => {
    const data = [
        { name: 'GPT-4o', percentage: 45, color: 'bg-primary', width: '45%' },
        { name: 'Claude-3.5-Sonnet', percentage: 30, color: 'bg-purple-500', width: '30%' },
        { name: 'Gemini-Pro', percentage: 15, color: 'bg-teal-500', width: '15%' },
        { name: 'Llama-3-70b', percentage: 10, color: 'bg-orange-500', width: '10%' },
    ];

  return (
    <div className="bg-[#1a2632] border border-[#233648] rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-lg font-bold m-0">Token 消耗分布</h3>
        <Button type="text" icon={<MoreOutlined className="text-primary hover:text-white" />} />
      </div>
      <div className="flex-1 flex flex-col gap-5 justify-center">
        {data.map((item) => (
            <div key={item.name} className="group">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                    <span className="text-slate-400 text-xs font-mono">{item.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-[#111a22] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.width }}></div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default TokenDistribution;
