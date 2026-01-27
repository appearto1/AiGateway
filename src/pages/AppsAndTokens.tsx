import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Table, 
  Typography, 
  Space, 
  Tooltip,
  ConfigProvider,
  theme,
  Modal,
  Form,
  Switch,
  message,
  Popconfirm,
  InputNumber,
  DatePicker,
  TreeSelect,
  Radio
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  FilterOutlined, 
  ExportOutlined, 
  EditOutlined, 
  KeyOutlined, 
  InfoCircleFilled,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltFilled,
  CloudFilled,
  DeleteOutlined,
  BarChartOutlined,
  ReadFilled,
  InfoCircleOutlined
} from '@ant-design/icons';
import { 
  getApps, createApp, updateApp, rotateAppSecret, deleteApp, getModelProviders, getAppModelStats,
  getKBForApp, getMcpServers
} from '../services/api';
import type { AppData, ModelProvider, AppUsageStatsByModel, KnowledgeLibrary, KnowledgeSkill, McpServer } from '../services/api';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

const AppsAndTokens: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<AppData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppData | null>(null);
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>([]);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<string>('');
  const [currentAppName, setCurrentAppName] = useState<string>('');
  const [modelStats, setModelStats] = useState<AppUsageStatsByModel[]>([]);
  const [statsDateRange, setStatsDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day'), // 7天前（包含今天共7天）
    dayjs() // 今天
  ]);
  
  // Knowledge Base State
  const [kbTreeData, setKbTreeData] = useState<any[]>([]);
  const [isAgentEnabled, setIsAgentEnabled] = useState(false);
  
  // MCP State
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

  // Combine models from all active providers
  const allAvailableModels = modelProviders.reduce((acc: any[], provider) => {
      try {
          const models = JSON.parse(provider.models || '[]');
          if (Array.isArray(models)) {
              return [...acc, ...models.map(m => ({
                  label: `${m} (${provider.name})`,
                  value: m,
                  provider: provider.name
              }))];
          }
          return acc;
      } catch (e) {
          console.error("Failed to parse models for provider", provider.name, e);
          return acc;
      }
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await getApps(searchName, filterStatus);
      if (res.code === 200) {
        setApps(res.data || []);
      } else {
        messageApi.error(res.msg || '获取应用列表失败');
      }
    } catch (error) {
      console.error(error);
      messageApi.error('获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchModelProviders = async () => {
      try {
          const res = await getModelProviders('', 0); // Get active providers
          if (res.code === 200) {
              setModelProviders(res.data || []);
          }
      } catch (error) {
          console.error(error);
      }
  };

  const fetchKnowledgeData = async () => {
    try {
        const res = await getKBForApp();
        
        if (res.code === 200) {
            const libs = res.data.libraries || [];
            const skills = res.data.skills || [];
            
            // Construct Tree Data
            const tree = libs.map((lib: KnowledgeLibrary) => {
                const libSkills = skills.filter((s: KnowledgeSkill) => s.libraryId === lib.id);
                return {
                    title: lib.name,
                    value: `lib_${lib.id}`,
                    key: `lib_${lib.id}`,
                    children: libSkills.map((skill: KnowledgeSkill) => ({
                        title: skill.title,
                        value: skill.id, // Use actual skill ID as value
                        key: skill.id,
                        isLeaf: true
                    }))
                };
            });
            setKbTreeData(tree);
        }
    } catch (error) {
        console.error("Failed to fetch KB data", error);
    }
  };

  const fetchMcpServers = async () => {
    try {
        const res = await getMcpServers();
        if (res.code === 200) {
            setMcpServers(res.data.list || []);
        }
    } catch (error) {
        console.error("Failed to fetch MCP servers", error);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchModelProviders();
    fetchKnowledgeData();
    fetchMcpServers();
  }, [searchName, filterStatus]);

  const handleEdit = (app: AppData) => {
    setEditingApp(app);
    
    // Parse configs
    let selectedModels: string[] = [];
    let selectedKbs: string[] = [];
    let selectedMcps: string[] = [];
    try {
        if (app.model_config) selectedModels = JSON.parse(app.model_config);
        if (app.kb_config) {
            selectedKbs = JSON.parse(app.kb_config);
            setIsAgentEnabled(selectedKbs.length > 0);
        } else {
            setIsAgentEnabled(false);
        }
        if (app.mcp_config) selectedMcps = JSON.parse(app.mcp_config);
    } catch (e) {
        console.error("Failed to parse config", e);
    }

    form.setFieldsValue({
      name: app.name,
      description: app.description,
      status: app.status === 0,
      app_secret: app.app_secret,
      token_limit: app.token_limit,
      daily_token_limit: app.daily_token_limit,
      qps_limit: app.qps_limit,
      selected_models: selectedModels,
      selected_kbs: selectedKbs,
      selected_mcps: selectedMcps
    });
    setIsModalOpen(true);
  };

    const handleCreate = () => {
    setEditingApp(null);
    setIsAgentEnabled(false);
    form.resetFields();
    form.setFieldsValue({
        status: true,
        token_limit: 10000000,
        daily_token_limit: 500000,
        qps_limit: 10,
        selected_models: [],
        selected_kbs: [],
        selected_mcps: []
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingApp(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
        const values = await form.validateFields();
        
        // If agent mode is disabled, clear KB config
        const finalKbs = isAgentEnabled ? (values.selected_kbs || []) : [];
        
        const payload = {
            ...values,
            status: values.status ? 0 : 1,
            model_config: JSON.stringify(values.selected_models || []),
            kb_config: JSON.stringify(finalKbs),
            mcp_config: JSON.stringify(values.selected_mcps || []),
        };

        let res;
        if (editingApp) {
            res = await updateApp({ ...payload, id: editingApp.id });
        } else {
            res = await createApp(payload);
        }

        if (res.code === 200) {
            messageApi.success(editingApp ? '更新成功' : '创建成功');
            handleModalClose();
            fetchApps();
        } else {
            messageApi.error(res.msg || '操作失败');
        }
    } catch (error) {
        console.error(error);
    }
  };

  const handleRotateSecret = async () => {
      if (!editingApp) return;
      try {
          const res = await rotateAppSecret(editingApp.id);
          if (res.code === 200) {
              messageApi.success('密钥已轮换');
              setEditingApp(prev => prev ? ({...prev, app_secret: res.data.app_secret}) : null);
              form.setFieldValue('app_secret', res.data.app_secret);
              fetchApps();
          } else {
              messageApi.error(res.msg || '轮换失败');
          }
      } catch (error) {
          messageApi.error('轮换失败');
      }
  };

  const handleDelete = async (id: string) => {
      try {
          const res = await deleteApp(id);
          if (res.code === 200) {
              messageApi.success('删除成功');
              fetchApps();
          } else {
              messageApi.error(res.msg || '删除失败');
          }
      } catch (error) {
          messageApi.error('删除失败');
      }
  };

  const handleCopy = async (text: string, successMessage: string = '已复制') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        messageApi.success(successMessage);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          messageApi.success(successMessage);
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          messageApi.error('复制失败');
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
      messageApi.error('复制失败');
    }
  };

  const columns = [
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: AppData) => (
        <div className="flex items-center gap-3 py-1">
          <div className={`size-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0 ${record.avatar_bg || 'bg-blue-500'}`}>
            {record.avatar_text || record.name.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <Text className="text-white font-medium text-sm">{record.name}</Text>
            <Text className="text-slate-500 text-[10px]">{record.updatedTime}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'APP ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => (
        <Tooltip title="点击复制 ID">
            <Text 
                className="bg-[#111a22] text-slate-400 px-2 py-1 rounded font-mono text-[11px] border border-[#233648] cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleCopy(text, 'ID 已复制')}
            >
            {text}
            </Text>
        </Tooltip>
      ),
    },
    {
      title: '应用密钥',
      dataIndex: 'app_secret',
      key: 'app_secret',
      render: (_: any, record: AppData) => {
        const fullKey = `${record.id}_${record.app_secret}`;
        return (
          <div className="flex items-center gap-2">
              <Text className="text-slate-500 font-mono text-[11px] bg-[#111a22] px-2 py-1 rounded border border-[#233648]">
                  {record.app_secret ? `${fullKey.substring(0, 12)}...${fullKey.substring(fullKey.length - 4)}` : '未生成'}
              </Text>
              <Tooltip title="复制完整密钥 (Format: appid_AppSecret)">
                  <Button 
                      type="text" 
                      icon={<ExportOutlined className="text-[10px]" />} 
                      size="small" 
                      className="text-slate-500 hover:text-primary"
                      onClick={() => handleCopy(fullKey, '密钥已复制到剪贴板')}
                  />
              </Tooltip>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${
          status === 0 
          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
          : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
        }`}>
          <span className={`size-1.5 rounded-full ${status === 0 ? 'bg-green-500' : 'bg-slate-500'}`}></span>
          {status === 0 ? '活跃' : '已停用'}
        </div>
      ),
    },
    {
      title: '服务模式',
      dataIndex: 'kb_config',
      key: 'mode',
      render: (kbConfig: string) => {
        let isAgent = false;
        try {
            const kbs = JSON.parse(kbConfig || '[]');
            isAgent = kbs.length > 0;
        } catch(e) {}
        
        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                isAgent 
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {isAgent ? <ThunderboltFilled className="text-[10px]" /> : <SyncOutlined className="text-[10px]" />}
                {isAgent ? 'Agent' : 'Proxy'}
            </div>
        );
      }
    },
    {
      title: 'Token 限额',
      dataIndex: 'token_limit',
      key: 'token_limit',
      render: (limit: number) => (
        <Text className="text-slate-400 text-xs">
            {limit > 0 ? limit.toLocaleString() : '无限制'}
        </Text>
      ),
    },
    {
      title: '总 TOKEN 用量',
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      align: 'right' as const,
      render: (text: number) => (
        <Text className="text-slate-200 font-mono text-sm">{text?.toLocaleString() || 0}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: AppData) => (
        <Space size="middle">
          <Tooltip title="编辑">
            <Button 
                type="text" 
                icon={<EditOutlined className="text-slate-400 hover:text-white" />} 
                size="small" 
                onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="重置密钥">
            <Popconfirm 
                title="确定要重置密钥吗？旧密钥将立即失效。" 
                onConfirm={() => {
                    setEditingApp(record); // Temporarily set context
                    rotateAppSecret(record.id).then(res => {
                        if(res.code === 200) {
                             messageApi.success('密钥已重置');
                             fetchApps();
                        } else {
                             messageApi.error('重置失败');
                        }
                    });
                }}
            >
                <Button type="text" icon={<KeyOutlined className="text-slate-400 hover:text-white" />} size="small" />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="查看统计">
            <Button 
                type="text" 
                icon={<BarChartOutlined className="text-slate-400 hover:text-primary" />} 
                size="small" 
                onClick={() => handleViewStats(record.id, record.name)}
            />
          </Tooltip>
           <Tooltip title="删除">
            <Popconfirm title="确定要删除此应用吗？" onConfirm={() => handleDelete(record.id)}>
                <Button type="text" icon={<DeleteOutlined className="text-slate-400 hover:text-red-400" />} size="small" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleViewStats = async (appId: string, appName: string) => {
    setCurrentAppId(appId);
    setCurrentAppName(appName);
    // 重置为最近7天
    const defaultRange: [Dayjs, Dayjs] = [
      dayjs().subtract(6, 'day'),
      dayjs()
    ];
    setStatsDateRange(defaultRange);
    setStatsModalOpen(true);
    await fetchStatsData(appId, defaultRange);
  };

  const fetchStatsData = async (appId: string, dateRange: [Dayjs, Dayjs]) => {
    setStatsLoading(true);
    try {
      const startTime = dateRange[0].startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const endTime = dateRange[1].endOf('day').format('YYYY-MM-DD HH:mm:ss');
      
      const res = await getAppModelStats(appId, {
        start_time: startTime,
        end_time: endTime
      });
      if (res.code === 200) {
        setModelStats(res.data || []);
      } else {
        messageApi.error(res.msg || '获取统计信息失败');
      }
    } catch (error) {
      console.error(error);
      messageApi.error('获取统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleStatsDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const daysDiff = dates[1].diff(dates[0], 'day');
      if (daysDiff > 90) {
        messageApi.warning('日期范围不能超过3个月（90天）');
        return;
      }
      const range: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setStatsDateRange(range);
      fetchStatsData(currentAppId, range);
    }
  };


  return (
    <div className="space-y-6">
      {contextHolder}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">应用与 API Key 管理</h2>
          <p className="text-slate-400 text-sm mt-1">
            管理接入的第三方应用及其 API 密钥权限、模型配额与用量统计。
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          className="bg-primary hover:bg-blue-600 border-none h-10 px-6 font-bold shadow-lg shadow-blue-900/20"
          onClick={handleCreate}
        >
          新建应用
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <Input 
            prefix={<SearchOutlined className="text-slate-500" />}
            placeholder="搜索应用名称或 App ID..."
            className="max-w-md bg-[#1a2632] border-[#233648] text-white hover:border-primary focus:border-primary h-10"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            className="w-32 h-10"
            options={[
              { value: 'all', label: '所有状态' },
              { value: 0, label: '活跃' },
              { value: 1, label: '已停用' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<FilterOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 h-10 px-4" onClick={fetchApps}>刷新</Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            components: {
              Table: {
                headerBg: 'transparent',
                headerColor: '#94a3b8',
                headerSplitColor: 'transparent',
                colorBgContainer: 'transparent',
                borderColor: '#233648',
                rowHoverBg: 'rgba(255, 255, 255, 0.02)',
              }
            }
          }}
        >
          <Table 
            columns={columns} 
            dataSource={apps} 
            rowKey="id"
            pagination={{
                total: apps.length,
                pageSize: 10,
                showSizeChanger: false,
                className: "custom-pagination px-6 py-4"
            }}
            loading={loading}
            className="custom-table"
          />
        </ConfigProvider>
      </div>

      {/* Footer Note */}
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <InfoCircleOutlined className="text-primary" />
        <Text className="text-slate-500">
          如需轮换 API Key，请点击行尾的"重置密钥"按钮。旧密钥将在 24 小时后失效，请确保所有相关应用已更新。
        </Text>
      </div>

      {/* Edit App Modal */}
      <ConfigProvider
        theme={{
            algorithm: theme.darkAlgorithm,
            token: {
                colorBgElevated: '#1a2632',
                colorBorder: '#233648',
                borderRadiusLG: 12,
            },
            components: {
                Modal: {
                    headerBg: '#1a2632',
                    contentBg: '#1a2632',
                    titleColor: 'white',
                    paddingContentHorizontal: 0,
                },
                Input: {
                    colorBgContainer: '#111a22',
                    colorBorder: '#233648',
                    hoverBorderColor: '#137fec',
                    activeBorderColor: '#137fec',
                    paddingBlock: 10,
                },
                Checkbox: {
                    colorPrimary: '#137fec',
                    colorText: '#e2e8f0',
                },
                Select: {
                    colorBgContainer: '#111a22',
                    colorBorder: '#233648',
                },
                TreeSelect: {
                    colorBgContainer: '#111a22',
                    colorBorder: '#233648',
                }
            }
        }}
      >
        <Modal
            open={isModalOpen}
            onCancel={handleModalClose}
            footer={null}
            width={720}
            className="app-edit-modal"
            closeIcon={<CustomCloseOutlined className="text-slate-400 hover:text-white" />}
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                body: { padding: 0, border: '1px solid #233648' }
            }}
            title={
                <div className="px-6 py-5 border-b border-[#233648] flex items-center gap-3">
                    <EditOutlined className="text-primary text-xl" />
                    <div>
                        <h3 className="text-white text-lg font-bold m-0">{editingApp ? '编辑应用详情' : '创建新应用'}</h3>
                        <p className="text-slate-500 text-xs font-mono mt-0.5 mb-0">App ID: {editingApp?.id || '系统自动生成'}</p>
                    </div>
                </div>
            }
        >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <Form layout="vertical" className="space-y-6" form={form}>
                    {/* Section: Basic Info */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <InfoCircleFilled className="text-primary" />
                            <span className="text-white font-bold">基础信息</span>
                        </div>
                        
                        <Form.Item name="name" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用名称</span>} className="mb-0" rules={[{ required: true, message: '请输入应用名称' }]}>
                            <Input 
                                placeholder="输入应用名称"
                                className="text-white"
                            />
                        </Form.Item>
                        
                        <Form.Item name="description" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用描述</span>} className="mb-0">
                            <TextArea 
                                rows={3}
                                placeholder="简要描述应用用途..."
                                className="text-white"
                            />
                        </Form.Item>

                        <Form.Item name="status" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用状态</span>} className="mb-0" valuePropName="checked">
                            <Switch 
                                checkedChildren="活跃" 
                                unCheckedChildren="已停用"
                                className="bg-slate-600"
                            />
                        </Form.Item>
                    </div>

                    {/* Section: API Key Management */}
                    {editingApp && (
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <KeyOutlined className="text-primary" />
                            <span className="text-white font-bold">API Key 管理</span>
                        </div>

                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用密钥 (App Secret)</span>} className="mb-0">
                            <div className="flex gap-3">
                                <Form.Item noStyle>
                                    <Input.Password 
                                        readOnly
                                        value={editingApp ? `${editingApp.id}_${editingApp.app_secret}` : ''}
                                        placeholder="appid_secret"
                                        className="text-white font-mono flex-1"
                                        iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                    />
                                </Form.Item>
                                <Button icon={<SyncOutlined />} onClick={handleRotateSecret} className="bg-[#111a22] border-[#233648] text-slate-300 hover:text-white h-[42px] px-4">
                                    轮换密钥
                                </Button>
                            </div>
                        </Form.Item>
                    </div>
                    )}

                    {/* Section: Service Mode Selection (Progressive Disclosure) */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ThunderboltFilled className="text-primary" />
                                <span className="text-white font-bold">服务模式配置</span>
                            </div>
                            <Radio.Group 
                                value={isAgentEnabled ? 'agent' : 'proxy'} 
                                onChange={(e) => setIsAgentEnabled(e.target.value === 'agent')}
                                buttonStyle="solid"
                                size="small"
                                className="custom-radio-group"
                            >
                                <Radio.Button value="proxy">标准 Proxy</Radio.Button>
                                <Radio.Button value="agent">Agent 技能模式</Radio.Button>
                            </Radio.Group>
                        </div>
                        <p className="text-slate-500 text-[11px] mb-0">
                            {isAgentEnabled 
                                ? "Agent 模式允许模型调用知识库技能，支持多轮对话自动触发工具执行。" 
                                : "标准 Proxy 模式仅作为 API 转发，直接透明传递模型原始能力。"}
                        </p>
                    </div>

                    {/* Section: Knowledge Base Configuration (Only show if Agent mode enabled) */}
                    {isAgentEnabled && (
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <ReadFilled className="text-primary" />
                            <span className="text-white font-bold">知识库与技能配置</span>
                        </div>
                        
                        <Form.Item name="selected_kbs" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">选择关联的知识库技能</span>} className="mb-0">
                            <TreeSelect
                                treeData={kbTreeData}
                                treeCheckable={true}
                                showCheckedStrategy={TreeSelect.SHOW_CHILD}
                                placeholder="选择允许此应用访问的知识库技能（勾选知识库将自动选择其下所有技能）"
                                className="w-full"
                                dropdownStyle={{ maxHeight: 400, overflow: 'auto', backgroundColor: '#1a2632' }}
                                maxTagCount="responsive"
                                allowClear
                            />
                        </Form.Item>
                         <p className="text-slate-500 text-[10px] mt-2 italic">
                            * 勾选父节点（知识库）将默认选中该知识库下的所有技能。
                        </p>
                    </div>
                    )}

                    {/* Section: Quota & Rate Limits */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <ThunderboltFilled className="text-primary" />
                            <span className="text-white font-bold">额度与频率限制</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item name="token_limit" label={<span className="text-slate-400 text-xs font-medium">总 Token 额度</span>} className="mb-0">
                                <InputNumber 
                                    className="w-full text-white font-mono"
                                    placeholder="0表示无限制"
                                />
                            </Form.Item>
                            <Form.Item name="daily_token_limit" label={<span className="text-slate-400 text-xs font-medium">每日限额</span>} className="mb-0">
                                <InputNumber 
                                    className="w-full text-white font-mono"
                                    placeholder="0表示无限制"
                                />
                            </Form.Item>
                            <Form.Item name="qps_limit" label={<span className="text-slate-400 text-xs font-medium">QPS 限制</span>} className="mb-0">
                                <InputNumber 
                                    className="w-full text-white font-mono"
                                    placeholder="0表示无限制"
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Section: Model Access */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CloudFilled className="text-primary" />
                            <span className="text-white font-bold">模型权限配置</span>
                        </div>
                        
                        <Form.Item name="selected_models" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">选择允许访问的模型</span>} className="mb-0">
                            <Select
                                mode="multiple"
                                placeholder="选择允许此应用访问的模型..."
                                className="w-full"
                                options={allAvailableModels}
                                maxTagCount="responsive"
                                dropdownStyle={{ backgroundColor: '#1a2632' }}
                            />
                        </Form.Item>
                        <p className="text-slate-500 text-[10px] mt-2 italic">
                            * 仅显示目前已启用的模型厂商所支持的模型。
                        </p>
                    </div>

                    {/* Section: MCP Services */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ThunderboltFilled className="text-primary" />
                            <span className="text-white font-bold">MCP 工具服务</span>
                        </div>
                        
                        <Form.Item name="selected_mcps" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">选择 MCP 服务</span>} className="mb-0">
                            <Select
                                mode="multiple"
                                placeholder="选择允许此应用使用的 MCP 服务..."
                                className="w-full"
                                options={mcpServers.map(s => ({
                                    label: `${s.name} (${s.type})`,
                                    value: s.id
                                }))}
                                maxTagCount="responsive"
                                dropdownStyle={{ backgroundColor: '#1a2632' }}
                            />
                        </Form.Item>
                        <p className="text-slate-500 text-[10px] mt-2 italic">
                            * 选择的 MCP 服务将在模型测试时可用，模型可以调用这些服务提供的工具。
                        </p>
                    </div>
                </Form>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#233648] mt-6">
                    <Button 
                        onClick={handleModalClose}
                        className="bg-transparent border-[#334155] text-slate-300 hover:text-white hover:border-slate-400 h-10 px-6 rounded-lg"
                    >
                        取消
                    </Button>
                    <Button 
                        type="primary" 
                        onClick={handleSave}
                        className="bg-primary hover:bg-blue-600 border-none h-10 px-8 font-bold rounded-lg shadow-lg shadow-blue-900/20"
                    >
                        保存更改
                    </Button>
                </div>
            </div>
        </Modal>
      </ConfigProvider>

      {/* Stats Modal */}
      <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorBgElevated: '#1a2632',
              colorBorder: '#233648',
              borderRadiusLG: 12,
            },
            components: {
              Modal: {
                headerBg: '#1a2632',
                contentBg: '#1a2632',
                titleColor: 'white',
                paddingContentHorizontal: 0,
              },
              DatePicker: {
                colorBgContainer: '#111a22',
                colorBorder: '#233648',
                hoverBorderColor: '#137fec',
                activeBorderColor: '#137fec',
                colorText: '#e2e8f0',
                colorTextPlaceholder: '#64748b',
              },
            },
          }}
        >
          <Modal
            title={
              <div className="flex items-center gap-2">
                <BarChartOutlined className="text-primary" />
                <span>应用使用统计 - {currentAppName}</span>
              </div>
            }
            open={statsModalOpen}
            onCancel={() => setStatsModalOpen(false)}
            footer={null}
            width={900}
            className="stats-modal"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-400 text-sm">
                  统计该应用使用的模型及其 Token 使用情况
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">查询日期范围：</span>
                  <DatePicker.RangePicker
                    value={statsDateRange}
                    onChange={handleStatsDateRangeChange}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    className="w-64"
                  />
                </div>
              </div>
            
            {statsLoading ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : modelStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无统计数据</div>
            ) : (
              <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  components: {
                    Table: {
                      headerBg: 'transparent',
                      headerColor: '#94a3b8',
                      headerSplitColor: 'transparent',
                      colorBgContainer: 'transparent',
                      borderColor: '#233648',
                      rowHoverBg: 'rgba(255, 255, 255, 0.02)',
                    }
                  }
                }}
              >
                <Table
                  columns={[
                    {
                      title: '模型',
                      dataIndex: 'model',
                      key: 'model',
                      render: (text: string) => (
                        <Text className="text-white font-medium">{text}</Text>
                      ),
                    },
                    {
                      title: '厂商',
                      dataIndex: 'provider_name',
                      key: 'provider_name',
                      render: (text: string) => (
                        <Text className="text-slate-400">{text}</Text>
                      ),
                    },
                    {
                      title: '请求次数',
                      dataIndex: 'request_count',
                      key: 'request_count',
                      align: 'right' as const,
                      render: (text: number) => (
                        <Text className="text-slate-300">{text?.toLocaleString() || 0}</Text>
                      ),
                    },
                    {
                      title: '输入 Tokens',
                      dataIndex: 'prompt_tokens',
                      key: 'prompt_tokens',
                      align: 'right' as const,
                      render: (text: number) => (
                        <Text className="text-blue-400 font-mono">{text?.toLocaleString() || 0}</Text>
                      ),
                    },
                    {
                      title: '输出 Tokens',
                      dataIndex: 'completion_tokens',
                      key: 'completion_tokens',
                      align: 'right' as const,
                      render: (text: number) => (
                        <Text className="text-green-400 font-mono">{text?.toLocaleString() || 0}</Text>
                      ),
                    },
                    {
                      title: '总 Tokens',
                      dataIndex: 'total_tokens',
                      key: 'total_tokens',
                      align: 'right' as const,
                      render: (text: number) => (
                        <Text className="text-primary font-mono font-semibold">{text?.toLocaleString() || 0}</Text>
                      ),
                    },
                    {
                      title: '成功率',
                      key: 'success_rate',
                      align: 'right' as const,
                      render: (_: any, record: AppUsageStatsByModel) => {
                        const rate = record.request_count > 0 
                          ? ((record.success_count / record.request_count) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <Text className={parseFloat(rate) >= 95 ? 'text-green-400' : 'text-yellow-400'}>
                            {rate}%
                          </Text>
                        );
                      },
                    },
                  ]}
                  dataSource={modelStats}
                  rowKey="model"
                  pagination={false}
                  size="small"
                />
              </ConfigProvider>
            )}
            </div>
          </Modal>
        </ConfigProvider>
      </div>
  
  );
};

// Custom icons to fix potential missing icons
const CustomCloseOutlined = ({ className }: { className?: string }) => (
    <span role="img" aria-label="close" className={`anticon anticon-close ${className}`} onClick={() => {}}>
        <svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 00203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"></path></svg>
    </span>
);

export default AppsAndTokens;