import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { 
    CheckCircleOutlined, 
    CodeSandboxOutlined, 
    WarningOutlined,
    DatabaseOutlined, 
    FieldTimeOutlined,
    RiseOutlined,
    ArrowDownOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import StatusCard from '../components/StatusCard';
import RequestTrendChart from '../components/RequestTrendChart';
import TokenDistribution from '../components/TokenDistribution';
import RecentLogsTable from '../components/RecentLogsTable';
import { 
    getModelProviderStats, 
    getAppUsageLogs, 
    getAppUsageStatsByModel, 
    getRequestTrend,
} from '../services/api';
import type { AppUsageLogItem } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [logs, setLogs] = useState<AppUsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
        setLoading(true);
        const [statsRes, trendRes, distRes, logsRes] = await Promise.all([
            getModelProviderStats(),
            getRequestTrend(),
            getAppUsageStatsByModel(),
            getAppUsageLogs({ page: 1, page_size: 10 })
        ]);

        if (statsRes.code === 200) {
            setStats(statsRes.data);
        }
        if (trendRes.code === 200) {
            setTrendData(trendRes.data);
        }
        if (distRes.code === 200) {
            setDistributionData(distRes.data);
        }
        if (logsRes.code === 200) {
            setLogs(logsRes.data.list);
        }
    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
      return (
          <div className="flex justify-center items-center h-full min-h-[400px]">
              <LoadingOutlined style={{ fontSize: 48 }} spin />
          </div>
      );
  }

  return (
    <>
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard 
            title="系统状态 (Status)" 
            value={stats?.health || "Checking..."} 
            icon={<CheckCircleOutlined style={{ fontSize: '24px' }} className="text-green-500" />}
            iconColorClass="bg-green-500/10 border-green-500/20 group-hover:bg-green-500/20"
            borderColorClass="border-green-500/20"
            statusTag={<span className="bg-[#111a22] text-slate-400 text-xs px-2 py-1 rounded font-mono">active: {stats?.active_count}/{stats?.total_count}</span>}
        />
        <StatusCard 
            title="今日总 Token 消耗" 
            value={<span className="font-mono">{stats?.today_tokens?.toLocaleString() || 0}</span>} 
            icon={<CodeSandboxOutlined style={{ fontSize: '24px' }} className="text-primary" />} 
            iconColorClass="bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20"
            borderColorClass="border-blue-500/20"
            statusTag={
                <div className="flex items-center text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <RiseOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    Calls: {stats?.today_calls || 0}
                </div>
            }
        />
        <StatusCard 
            title="活跃模型渠道" 
            value={<span>{stats?.active_count || 0} <span className="text-slate-500 text-lg font-normal">/ {stats?.total_count || 0}</span></span>} 
            icon={<DatabaseOutlined style={{ fontSize: '24px' }} className="text-purple-400" />} 
            iconColorClass="bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20"
            borderColorClass="border-purple-500/20"
            statusTag={
                (stats?.total_count - stats?.active_count) > 0 ? (
                <div className="flex items-center text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <WarningOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    {stats?.total_count - stats?.active_count} 异常
                </div>
                ) : <span className="text-green-500 text-xs">All Systems Normal</span>
            }
        />
        <StatusCard 
            title="平均响应延迟 (Avg)" 
            value={<span className="font-mono">{stats?.avg_latency || 0}ms</span>} 
            icon={<FieldTimeOutlined style={{ fontSize: '24px' }} className="text-orange-400" />} 
            iconColorClass="bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20"
            borderColorClass="border-orange-500/20"
            statusTag={
                <div className="flex items-center text-slate-400 text-xs bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20">
                    <ArrowDownOutlined className="mr-1" style={{ fontSize: '12px' }} />
                    Real-time
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
                <RequestTrendChart data={trendData} />
            </div>
        </div>
        
        <div>
            <TokenDistribution data={distributionData} />
        </div>
      </div>

      {/* Table Section */}
      <RecentLogsTable data={logs} loading={loading} />
    </>
  );
};

export default Dashboard;
