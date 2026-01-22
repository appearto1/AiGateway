import React from 'react';
import { Select } from 'antd';
import { 
    CheckCircleOutlined, 
    CodeSandboxOutlined, 
    WarningOutlined,
    DatabaseOutlined, 
    FieldTimeOutlined,
    RiseOutlined,
    ArrowDownOutlined
} from '@ant-design/icons';
import StatusCard from '../components/StatusCard';
import RequestTrendChart from '../components/RequestTrendChart';
import TokenDistribution from '../components/TokenDistribution';
import RecentLogsTable from '../components/RecentLogsTable';

const Dashboard: React.FC = () => {
  return (
    <>
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard 
            title="系统状态 (Status)" 
            value="运行正常" 
            icon={<CheckCircleOutlined style={{ fontSize: '24px' }} className="text-green-500" />}
            iconColorClass="bg-green-500/10 border-green-500/20 group-hover:bg-green-500/20"
            borderColorClass="border-green-500/20"
            statusTag={<span className="bg-[#111a22] text-slate-400 text-xs px-2 py-1 rounded font-mono">uptime: 99.9%</span>}
        />
        <StatusCard 
            title="今日总 Token 消耗" 
            value={<span className="font-mono">2,450,120</span>} 
            icon={<CodeSandboxOutlined style={{ fontSize: '24px' }} className="text-primary" />} 
            iconColorClass="bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20"
            borderColorClass="border-blue-500/20"
            statusTag={
                <div className="flex items-center text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <RiseOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    +12.5%
                </div>
            }
        />
        <StatusCard 
            title="活跃模型渠道" 
            value={<span>12 <span className="text-slate-500 text-lg font-normal">/ 14</span></span>} 
            icon={<DatabaseOutlined style={{ fontSize: '24px' }} className="text-purple-400" />} 
            iconColorClass="bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20"
            borderColorClass="border-purple-500/20"
            statusTag={
                <div className="flex items-center text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <WarningOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    2 异常
                </div>
            }
        />
        <StatusCard 
            title="平均响应延迟 (P95)" 
            value={<span className="font-mono">245ms</span>} 
            icon={<FieldTimeOutlined style={{ fontSize: '24px' }} className="text-orange-400" />} 
            iconColorClass="bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20"
            borderColorClass="border-orange-500/20"
            statusTag={
                <div className="flex items-center text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <ArrowDownOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    -15ms
                </div>
            }
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1a2632] border border-[#233648] rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-white text-lg font-bold m-0">API 请求趋势</h3>
                    <p className="text-slate-400 text-sm m-0">过去 24 小时实时监控</p>
                </div>
                <Select 
                    defaultValue="24h" 
                    className="min-w-[140px]"
                    options={[
                        { value: '24h', label: 'Last 24 Hours' },
                        { value: '7d', label: 'Last 7 Days' },
                        { value: '30d', label: 'Last 30 Days' },
                    ]}
                />
            </div>
            <div className="flex-1 min-h-[250px] w-full relative">
                <RequestTrendChart />
            </div>
        </div>
        
        <div>
            <TokenDistribution />
        </div>
      </div>

      {/* Table Section */}
      <RecentLogsTable />
    </>
  );
};

export default Dashboard;
