import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Table, 
  Space, 
  ConfigProvider,
  Modal,
  message,
  DatePicker,
  Tag,
  Descriptions,
  Typography,
  Tooltip,
  Badge,
  Avatar,
  theme
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  ExportOutlined,
  EyeOutlined,
  FilterOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  TeamOutlined,
  GlobalOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
  AreaChartOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { 
  getAppUsageLogs, 
  getApps,
  getModelProviders,
  getOrgTree,
  type AppUsageLogItem,
  type AppUsageStatsParams,
  type AppData,
  type ModelProvider,
  type OrgData
} from '../services/api';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const CallLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AppUsageLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 筛选条件
  const [appId, setAppId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [requestId, setRequestId] = useState<string>('');

  // 下拉选项
  const [apps, setApps] = useState<AppData[]>([]);
  const [tenants, setTenants] = useState<OrgData[]>([]);
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<Array<{ label: string; value: string }>>([]);
  
  // 详情 Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AppUsageLogItem | null>(null);
  
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();

  // 模拟趋势数据
  const trendData = [
    { name: '00:00', value: 400 },
    { name: '04:00', value: 300 },
    { name: '08:00', value: 900 },
    { name: '12:00', value: 1200 },
    { name: '16:00', value: 1500 },
    { name: '20:00', value: 1100 },
    { name: '23:59', value: 800 },
  ];

  // 获取应用列表
  const fetchApps = async () => {
    try {
      const res = await getApps();
      if (res.code === 200) {
        setApps(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch apps', error);
    }
  };

  // 获取租户列表（组织树根节点，仅系统角色可见多租户时用于筛选）
  const fetchTenants = async () => {
    try {
      const res = await getOrgTree();
      if (res.code === 200) {
        const data = res.data || [];
        setTenants(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants', error);
    }
  };

  // 获取模型提供商列表并提取所有模型
  const fetchModelProviders = async () => {
    try {
      const res = await getModelProviders();
      if (res.code === 200) {
        setModelProviders(res.data || []);
        // 提取所有模型
        const allModels: Array<{ label: string; value: string }> = [];
        (res.data || []).forEach((provider: ModelProvider) => {
          try {
            const providerModels = JSON.parse(provider.models || '[]');
            if (Array.isArray(providerModels)) {
              providerModels.forEach((m: string) => {
                if (!allModels.find(item => item.value === m)) {
                  allModels.push({
                    label: `${m} (${provider.name})`,
                    value: m
                  });
                }
              });
            }
          } catch (e) {
            console.error('Failed to parse models for provider', provider.name, e);
          }
        });
        setModels(allModels);
      }
    } catch (error) {
      console.error('Failed to fetch model providers', error);
    }
  };

  // 获取日志列表
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: AppUsageStatsParams = {
        page,
        page_size: pageSize,
      };
      
      if (appId) {
        params.app_id = appId;
      }
      if (tenantId) {
        params.tenant_id = tenantId;
      }
      if (model) {
        params.model = model;
      }
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_time = dateRange[0].format('YYYY-MM-DD HH:mm:ss');
        params.end_time = dateRange[1].format('YYYY-MM-DD HH:mm:ss');
      }
      
      if (requestId.trim()) {
        params.request_id = requestId.trim();
      }
      
      const res = await getAppUsageLogs(params);
      if (res.code === 200) {
        setLogs(res.data.list || []);
        setTotal(res.data.total || 0);
      } else {
        messageApi.error(res.msg || '获取日志失败');
      }
    } catch (error) {
      console.error('Failed to fetch logs', error);
      messageApi.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchTenants();
    fetchModelProviders();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, appId, tenantId, model, dateRange]);

  // 处理搜索
  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  // 重置筛选
  const handleReset = () => {
    setAppId('');
    setTenantId('');
    setModel('');
    setDateRange(null);
    setRequestId('');
    setPage(1);
  };

  // 查看详情
  const handleViewDetail = (log: AppUsageLogItem) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  // 导出日志（简单实现，可以后续完善）
  const handleExport = () => {
    messageApi.info('导出功能开发中...');
  };

  // 表格列定义
  const columns: ColumnsType<AppUsageLogItem> = [
    {
      title: '请求时间 / Request ID',
      dataIndex: 'request_time',
      key: 'request_time',
      width: 280,
      fixed: 'left',
      render: (time, record) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <ClockCircleOutlined className="text-slate-500 text-xs" />
            <span className="text-slate-200 font-medium text-sm">{time}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-600 text-[10px] font-mono tracking-tighter truncate max-w-[200px]" title={record.request_id}>
              ID: {record.request_id}
            </span>
            <Tooltip title="复制 ID">
              <Button 
                type="text" 
                size="small" 
                icon={<CopyOutlined className="text-[10px]" />} 
                className="h-4 w-4 flex items-center justify-center text-slate-600 hover:text-indigo-400"
                onClick={() => {
                  navigator.clipboard.writeText(record.request_id);
                  messageApi.success('ID 已复制');
                }}
              />
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: '应用 / 租户',
      dataIndex: 'app_name',
      key: 'app_info',
      width: 220,
      render: (text, record) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/10 p-1 rounded-md">
              <AppstoreOutlined className="text-indigo-400 text-xs" />
            </div>
            <span className="text-white font-semibold text-sm">{text || '未知应用'}</span>
          </div>
          {record.tenant_name && (
            <div className="flex items-center gap-1 ml-6">
              <TeamOutlined className="text-slate-600 text-[10px]" />
              <span className="text-slate-500 text-xs">{record.tenant_name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'AI 模型 / 厂商',
      dataIndex: 'model',
      key: 'model_info',
      width: 250,
      render: (model, record) => {
        let colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (model.toLowerCase().includes('claude')) colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (model.toLowerCase().includes('gemini')) colorClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        if (model.toLowerCase().includes('llama')) colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        if (model.toLowerCase().includes('deepseek')) colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center">
              <Tag className={`${colorClass} border-0 rounded-md font-bold text-xs m-0`}>
                {model}
              </Tag>
            </div>
            {record.provider_name && (
              <div className="flex items-center gap-1.5 ml-0.5 mt-0.5">
                <div className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-500 text-[11px] font-medium tracking-wide uppercase">{record.provider_name}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status, record) => {
        const isError = status >= 400;
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge 
              status={isError ? 'error' : 'success'} 
              text={
                <span className={`font-black font-mono ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {status}
                </span>
              } 
            />
            {isError && record.status_message && (
              <Tooltip title={record.status_message}>
                <span className="text-red-500/60 text-[10px] truncate max-w-[80px] cursor-help italic">
                  {record.status_message}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Token 消耗 (Prompt / Comp. / Total)',
      dataIndex: 'total_tokens',
      key: 'tokens',
      width: 280,
      align: 'right',
      render: (_, record) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-black font-mono text-base">{record.total_tokens?.toLocaleString() || 0}</span>
            <ThunderboltOutlined className="text-amber-400 text-xs" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span>P: {record.prompt_tokens?.toLocaleString() || 0}</span>
            <span className="text-slate-700">|</span>
            <span>C: {record.completion_tokens?.toLocaleString() || 0}</span>
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => handleViewDetail(record)}
          className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 flex items-center justify-center rounded-lg"
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: '#1a2632',
          borderRadius: 12,
        },
        components: {
          Table: {
            headerBg: '#111a22',
            headerColor: '#94a3b8',
            rowHoverBg: '#1f2d3a',
            paddingContentVerticalLG: 20,
          },
          Select: {
            colorBgContainer: '#1a2632',
            colorBorder: '#233648',
          },
          Input: {
            colorBgContainer: '#1a2632',
            colorBorder: '#233648',
          },
          DatePicker: {
            colorBgContainer: '#1a2632',
            colorBorder: '#233648',
          }
        }
      }}
    >
      <div className="h-full flex flex-col space-y-6 p-2">
        {contextHolder}
        
        {/* Top Header */}
        <div className="flex justify-between items-end mb-2 px-1">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30">
                <HistoryOutlined className="text-indigo-400 text-xl" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Call <span className="text-indigo-500">Analytics</span> Logs</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium ml-12">
              API Traffic Monitoring <span className="text-slate-600 mx-1">/</span> 全球接口调用审计与性能分析
            </p>
          </div>
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center bg-[#1a2632]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#233648] shadow-sm">
              <SafetyCertificateOutlined className="text-emerald-500 mr-2" />
              <span className="text-slate-300 text-xs font-bold tracking-wide uppercase">Audit Ready</span>
            </div>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport} 
              className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-indigo-500/50 rounded-xl h-10 px-6 font-bold shadow-lg transition-all"
            >
              数据导出
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
          {/* Total Requests Card */}
          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-indigo-500/30 transition-colors shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Requests</p>
                <h3 className="text-3xl font-black text-white mb-1">{total.toLocaleString()}</h3>
                <div className="flex items-center gap-2">
                  <Badge status="success" />
                  <span className="text-emerald-500 text-xs font-bold">+12.5%</span>
                  <span className="text-slate-600 text-[10px] uppercase">vs last 24h</span>
                </div>
              </div>
              <div className="bg-indigo-500/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <BarChartOutlined className="text-indigo-400 text-2xl" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChartOutlined style={{ fontSize: '120px' }} className="text-white" />
            </div>
          </div>

          {/* Error Rate Card */}
          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-red-500/30 transition-colors shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">System Reliability</p>
                <h3 className="text-3xl font-black text-white mb-1">99.98%</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded text-red-400 text-[10px] font-bold">
                    <CloseCircleOutlined />
                    <span>0.02% Error</span>
                  </div>
                </div>
              </div>
              <div className="bg-red-500/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <SafetyCertificateOutlined className="text-red-400 text-2xl" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <SafetyCertificateOutlined style={{ fontSize: '120px' }} className="text-white" />
            </div>
          </div>

          {/* Token Usage History with mini chart */}
          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-amber-500/30 transition-colors shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-start h-full">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Token Throughput</p>
                  <h3 className="text-3xl font-black text-white mb-1">
                    {(logs.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0)).toLocaleString()}
                  </h3>
                  <span className="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">Current Page Vol.</span>
                </div>
              </div>
              <div className="flex-1 h-16 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1a2632] border border-[#233648] rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="bg-[#111a22] p-2 rounded-lg border border-[#233648]">
                <FilterOutlined className="text-indigo-400" />
              </div>
              <Select
                placeholder="按应用筛选"
                value={appId || undefined}
                onChange={setAppId}
                allowClear
                className="flex-1 h-10 custom-select"
                popupClassName="custom-dropdown"
                options={apps.map(app => ({
                  label: app.name,
                  value: app.id
                }))}
              />
            </div>

            <Select
              placeholder="按租户筛选"
              value={tenantId || undefined}
              onChange={setTenantId}
              allowClear
              className="w-40 h-10 custom-select"
              popupClassName="custom-dropdown"
              options={tenants.map(t => ({
                label: t.name,
                value: t.id
              }))}
            />

            <Select
              placeholder="选择 AI 模型"
              value={model || undefined}
              onChange={setModel}
              allowClear
              showSearch
              className="w-56 h-10 custom-select"
              popupClassName="custom-dropdown"
              options={models}
            />

            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              showTime
              format="MM-DD HH:mm"
              className="w-72 h-10 bg-[#1a2632] border-[#233648] rounded-xl hover:border-indigo-500/50"
              suffixIcon={<CalendarOutlined className="text-slate-500" />}
            />

            <Input
              placeholder="搜索请求 ID..."
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              prefix={<SearchOutlined className="text-slate-500" />}
              className="w-48 h-10 bg-[#1a2632] border-[#233648] rounded-xl hover:border-indigo-500/50"
              allowClear
              onPressEnter={handleSearch}
            />

            <div className="flex gap-2">
              <Tooltip title="执行搜索">
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />} 
                  onClick={handleSearch}
                  className="bg-indigo-600 hover:bg-indigo-500 border-0 h-10 w-10 flex items-center justify-center rounded-xl shadow-lg shadow-indigo-600/20"
                />
              </Tooltip>
              <Tooltip title="重置筛选">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleReset}
                  className="bg-[#111a22] border-[#233648] text-slate-400 hover:text-white hover:border-indigo-500/50 h-10 w-10 flex items-center justify-center rounded-xl"
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-[#1a2632] border border-[#233648] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => (
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                  Total <span className="text-indigo-400 mx-1">{total}</span> Entries
                </span>
              ),
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
              className: "px-6 py-4 border-t border-[#233648] m-0",
            }}
            scroll={{ x: 1400, y: 'calc(100vh - 480px)' }}
            className="custom-table"
            rowClassName={() => "group cursor-default"}
          />
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={720}
        closeIcon={null}
        className="custom-modal"
        styles={{
          mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
          content: { padding: 0, border: '1px solid #233648', backgroundColor: '#1a2632', borderRadius: '24px', overflow: 'hidden' }
        }}
        title={
          <div className="px-8 py-6 border-b border-[#233648] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/20 p-2 rounded-xl">
                <InfoCircleOutlined className="text-indigo-400 text-xl" />
              </div>
              <div>
                <h3 className="text-white text-lg font-black m-0 tracking-tight">请求事务详情</h3>
                <p className="text-slate-500 text-[10px] font-mono mt-0.5 mb-0 tracking-tighter uppercase">Transaction Audit View</p>
              </div>
            </div>
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              className="text-slate-500 hover:text-white"
              onClick={() => fetchLogs()}
            />
          </div>
        }
      >
        {selectedLog && (
          <div className="p-8 space-y-8">
            {/* Status & Key Metrics Header */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#111a22] p-4 rounded-2xl border border-[#233648] flex flex-col items-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Status</span>
                <Tag color={selectedLog.status >= 400 ? 'red' : 'green'} className="m-0 font-black border-0 bg-transparent text-lg">
                  {selectedLog.status}
                </Tag>
              </div>
              <div className="bg-[#111a22] p-4 rounded-2xl border border-[#233648] flex flex-col items-center col-span-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Consumption</span>
                <div className="flex items-center gap-2">
                  <ThunderboltOutlined className="text-amber-400" />
                  <span className="text-white text-xl font-black font-mono">{selectedLog.total_tokens?.toLocaleString() || 0}</span>
                  <span className="text-slate-500 text-xs font-bold uppercase">Tokens</span>
                </div>
              </div>
              <div className="bg-[#111a22] p-4 rounded-2xl border border-[#233648] flex flex-col items-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Latency</span>
                <span className="text-indigo-400 text-lg font-black font-mono">-- <small className="text-[10px]">ms</small></span>
              </div>
            </div>

            {/* Detailed Info Groups */}
            <div className="space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                  <h4 className="text-white text-sm font-bold uppercase tracking-wider m-0">核心标识 / Core Identifiers</h4>
                </div>
                <div className="bg-[#111a22] p-6 rounded-2xl border border-[#233648] space-y-4">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400 text-xs">Request ID</span>
                    <Text copyable className="text-indigo-300 font-mono text-xs">{selectedLog.request_id}</Text>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400 text-xs">Application Name</span>
                    <span className="text-white font-bold text-sm">{selectedLog.app_name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 text-xs">Application ID</span>
                    <Text copyable className="text-slate-400 font-mono text-xs">{selectedLog.app_id}</Text>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h4 className="text-white text-sm font-bold uppercase tracking-wider m-0">AI 运行时 / AI Runtime</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111a22] p-5 rounded-2xl border border-[#233648]">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-2">Model Interface</p>
                    <span className="text-emerald-400 font-black text-base">{selectedLog.model}</span>
                  </div>
                  <div className="bg-[#111a22] p-5 rounded-2xl border border-[#233648]">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-2">Service Provider</p>
                    <span className="text-white font-bold text-base uppercase tracking-tight">{selectedLog.provider_name || '-'}</span>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 bg-amber-500 rounded-full" />
                  <h4 className="text-white text-sm font-bold uppercase tracking-wider m-0">资源审计 / Usage Audit</h4>
                </div>
                <div className="bg-[#111a22] p-6 rounded-2xl border border-[#233648] grid grid-cols-3 gap-8">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Prompt</span>
                    <span className="text-white font-mono text-lg font-bold">{selectedLog.prompt_tokens?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Completion</span>
                    <span className="text-white font-mono text-lg font-bold">{selectedLog.completion_tokens?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-8">
                    <span className="text-amber-500 text-[10px] font-bold uppercase mb-1">Aggregate</span>
                    <span className="text-white font-mono text-xl font-black">{selectedLog.total_tokens?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </section>

              {selectedLog.status_message && (
                <section>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-1 h-4 bg-red-500 rounded-full" />
                    <h4 className="text-white text-sm font-bold uppercase tracking-wider m-0">异常诊断 / Diagnostics</h4>
                  </div>
                  <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/20">
                    <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap m-0 leading-relaxed">
                      {selectedLog.status_message}
                    </pre>
                  </div>
                </section>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#233648]">
              <Button 
                onClick={() => setDetailModalOpen(false)} 
                className="bg-[#111a22] border-[#233648] text-slate-400 hover:text-white h-11 px-10 rounded-xl font-bold"
              >
                关闭审计面板
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  );
};

export default CallLogs;
