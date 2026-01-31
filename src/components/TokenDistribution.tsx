import React from 'react';
import { Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

interface TokenDistributionProps {
    data: any[];
}

const COLORS = ['bg-primary', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-green-500'];

const TokenDistribution: React.FC<TokenDistributionProps> = ({ data }) => {
    const safeData = Array.isArray(data) ? data : [];
    // Calculate total tokens across all models
    const totalTokens = safeData.reduce((sum, item) => sum + (item?.total_tokens ?? 0), 0);

    // Sort by tokens desc and take top 5
    const topModels = [...safeData]
        .sort((a, b) => b.total_tokens - a.total_tokens)
        .slice(0, 5)
        .map((item, index) => ({
            name: item.model,
            percentage: totalTokens > 0 ? Math.round((item.total_tokens / totalTokens) * 100) : 0,
            color: COLORS[index % COLORS.length],
            width: totalTokens > 0 ? `${Math.round((item.total_tokens / totalTokens) * 100)}%` : '0%'
        }));

  return (
    <div className="bg-[#1a2632] border border-[#233648] rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-lg font-bold m-0">Token 消耗分布</h3>
        <Button type="text" icon={<MoreOutlined className="text-primary hover:text-white" />} />
      </div>
      <div className="flex-1 flex flex-col gap-5 justify-center">
        {topModels.length > 0 ? topModels.map((item) => (
            <div key={item.name} className="group">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                    <span className="text-slate-400 text-xs font-mono">{item.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-[#111a22] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.width }}></div>
                </div>
            </div>
        )) : (
            <div className="text-slate-500 text-center text-sm">暂无数据</div>
        )}
      </div>
    </div>
  );
};

export default TokenDistribution;
