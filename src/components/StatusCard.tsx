import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface StatusCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconColorClass: string;
  statusTag?: React.ReactNode;
  borderColorClass?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, icon, iconColorClass, statusTag, borderColorClass }) => {
  return (
    <div className="bg-[#1a2632] border border-[#233648] rounded-xl p-5 flex flex-col justify-between hover:border-primary/30 transition-colors group h-full">
      <div className="flex justify-between items-start mb-4">
        <div className={`size-10 rounded-lg flex items-center justify-center border ${borderColorClass} ${iconColorClass} transition-colors`}>
          {icon}
        </div>
        {statusTag}
      </div>
      <div>
        <Text className="text-slate-400 text-sm font-medium mb-1 block">{title}</Text>
        <div className="text-white text-2xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  );
};

export default StatusCard;
