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
  Typography
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  ExportOutlined,
  EyeOutlined,
  FilterOutlined
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
      title: '时间',
      dataIndex: 'request_time',
      key: 'request_time',
      width: 180,
      render: (text) => (
        <span className="text-slate-300 font-mono text-xs">{text}</span>
      ),
    },
    {
      title: '请求 ID',
      dataIndex: 'request_id',
      key: 'request_id',
      width: 200,
      render: (text) => (
        <span className="text-slate-300 font-mono text-xs truncate block" title={text}>
          {text}
        </span>
      ),
    },
    {
      title: '应用',
      dataIndex: 'app_name',
      key: 'app_name',
      width: 150,
      render: (text) => (
        <span className="text-white font-medium">{text || '-'}</span>
      ),
    },
    {
      title: '租户',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
      width: 120,
      render: (text) => (
        <span className="text-slate-300">{text || '-'}</span>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 200,
      render: (model) => {
        let colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (model.includes('claude')) colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (model.includes('gemini')) colorClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        if (model.includes('llama')) colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

        return (
          <Tag className={`${colorClass} border`}>
            {model}
          </Tag>
        );
      },
    },
    {
      title: '提供商',
      dataIndex: 'provider_name',
      key: 'provider_name',
      width: 120,
      render: (text) => (
        <span className="text-slate-300">{text || '-'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status) => {
        const isError = status >= 400;
        const colorClass = isError 
          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
          : 'bg-green-500/20 text-green-400 border-green-500/30';
        return (
          <Tag className={`${colorClass} border`}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Prompt Tokens',
      dataIndex: 'prompt_tokens',
      key: 'prompt_tokens',
      width: 120,
      align: 'right',
      render: (text) => (
        <span className="text-slate-300 font-mono">{text || 0}</span>
      ),
    },
    {
      title: 'Completion Tokens',
      dataIndex: 'completion_tokens',
      key: 'completion_tokens',
      width: 150,
      align: 'right',
      render: (text) => (
        <span className="text-slate-300 font-mono">{text || 0}</span>
      ),
    },
    {
      title: 'Total Tokens',
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      width: 120,
      align: 'right',
      render: (text) => (
        <span className="text-white font-semibold font-mono">{text || 0}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
          className="text-blue-400 hover:text-blue-300"
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white m-0">调用日志</h1>
        </div>

        {/* 筛选器 */}
        <div className="bg-[#1a2632] border border-[#233648] rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <FilterOutlined className="text-slate-400" />
            <span className="text-white font-medium">筛选条件</span>
          </div>
          <Space wrap size="middle" className="w-full">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm whitespace-nowrap">应用:</span>
              <Select
                placeholder="选择应用"
                value={appId || undefined}
                onChange={setAppId}
                allowClear
                className="min-w-[200px]"
                options={apps.map(app => ({
                  label: app.name,
                  value: app.id
                }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm whitespace-nowrap">租户:</span>
              <Select
                placeholder="选择租户"
                value={tenantId || undefined}
                onChange={setTenantId}
                allowClear
                className="min-w-[160px]"
                options={tenants.map(t => ({
                  label: t.name,
                  value: t.id
                }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm whitespace-nowrap">模型:</span>
              <Select
                placeholder="选择模型"
                value={model || undefined}
                onChange={setModel}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                className="min-w-[250px]"
                options={models}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm whitespace-nowrap">时间范围:</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                className="min-w-[400px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm whitespace-nowrap">请求ID:</span>
              <Input
                placeholder="搜索请求ID"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                prefix={<SearchOutlined className="text-slate-400" />}
                className="min-w-[200px]"
                allowClear
                onPressEnter={handleSearch}
              />
            </div>
          </Space>
          
          <div className="flex gap-2 mt-4">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              重置
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
          </div>
        </div>

        {/* 表格 */}
        <ConfigProvider
          theme={{
            components: {
              Table: {
                headerBg: '#111a22',
                headerColor: '#94a3b8',
                headerBorderRadius: 0,
                cellPaddingBlock: 16,
                cellPaddingInline: 24,
              },
              Button: {
                defaultBg: '#111a22',
                defaultBorderColor: '#334155',
                defaultColor: '#cbd5e1',
                defaultHoverBg: '#111a22',
                defaultHoverBorderColor: '#137fec',
                defaultHoverColor: '#137fec',
              }
            }
          }}
        >
          <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
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
                showTotal: (total) => `共 ${total} 条记录`,
                onChange: (newPage, newPageSize) => {
                  setPage(newPage);
                  setPageSize(newPageSize);
                },
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              scroll={{ x: 1500 }}
              rowClassName="hover:bg-[#1f2d3a] transition-colors"
            />
          </div>
        </ConfigProvider>
      </div>

      {/* 详情 Modal */}
      <Modal
        title="日志详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={800}
        styles={{
          content: {
            backgroundColor: '#1a2632',
            color: '#fff'
          },
          header: {
            backgroundColor: '#111a22',
            borderBottom: '1px solid #233648'
          }
        }}
      >
        {selectedLog && (
          <Descriptions
            column={1}
            bordered
            items={[
              {
                label: '请求ID',
                children: <Text copyable className="font-mono text-xs">{selectedLog.request_id}</Text>,
              },
              {
                label: '应用名称',
                children: selectedLog.app_name || '-',
              },
              {
                label: '应用ID',
                children: <Text copyable className="font-mono text-xs">{selectedLog.app_id}</Text>,
              },
              {
                label: '模型',
                children: selectedLog.model,
              },
              {
                label: '提供商',
                children: selectedLog.provider_name || '-',
              },
              {
                label: '状态码',
                children: (
                  <Tag color={selectedLog.status >= 400 ? 'red' : 'green'}>
                    {selectedLog.status}
                  </Tag>
                ),
              },
              {
                label: '状态消息',
                children: selectedLog.status_message || '-',
              },
              {
                label: '请求时间',
                children: selectedLog.request_time,
              },
              {
                label: 'Prompt Tokens',
                children: selectedLog.prompt_tokens || 0,
              },
              {
                label: 'Completion Tokens',
                children: selectedLog.completion_tokens || 0,
              },
              {
                label: 'Total Tokens',
                children: <Text strong>{selectedLog.total_tokens || 0}</Text>,
              },
            ]}
          />
        )}
      </Modal>
    </>
  );
};

export default CallLogs;
