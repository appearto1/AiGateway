import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Table, 
  Typography, 
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
  Radio,
  Badge,
  Tag
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  InfoCircleFilled,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltFilled,
  CloudFilled,
  DeleteOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
  AreaChartOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  TeamOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  LockOutlined,
  SettingOutlined,
  EditOutlined
} from '@ant-design/icons';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { 
  getApps, createApp, updateApp, rotateAppSecret, deleteApp, getModelProviders, getAppModelStats,
  getKBForApp, getMcpServers,
  getAppAuthorizations, addAppAuthorization, deleteAppAuthorization, getOrgList, getUserList
} from '../services/api';
import type { AppData, ModelProvider, AppUsageStatsByModel, KnowledgeLibrary, KnowledgeSkill, McpServer, AppAuthorizationItem, AppAuthTargetType } from '../services/api';
import type { OrgData } from '../services/api';
import type { UserData } from '../services/api';
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

  // 应用授权（个人/部门/租户）
  const [authList, setAuthList] = useState<AppAuthorizationItem[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [addAuthType, setAddAuthType] = useState<AppAuthTargetType>('department');
  const [addAuthValue, setAddAuthValue] = useState<string | null>(null);
  const [orgTreeData, setOrgTreeData] = useState<{ title: string; value: string; key: string; children?: any[] }[]>([]);
  const [userList, setUserList] = useState<UserData[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);

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
            
            const tree = libs.map((lib: KnowledgeLibrary) => {
                const libSkills = skills.filter((s: KnowledgeSkill) => s.libraryId === lib.id);
                return {
                    title: lib.name,
                    value: `lib_${lib.id}`,
                    key: `lib_${lib.id}`,
                    selectable: true,
                    children: libSkills.map((skill: KnowledgeSkill) => ({
                        title: skill.title,
                        value: skill.id,
                        key: skill.id,
                        isLeaf: true,
                        selectable: false,
                        disabled: true
                    }))
                };
            });
            setKbTreeData(tree);
        }
    } catch (error) {
        console.error("Failed to fetch KB data", error);
    }
  };

  const buildOrgTreeSelect = (nodes: OrgData[]): { title: string; value: string; key: string; children?: any[] }[] => {
    return (nodes || []).map((n) => ({
      title: n.name,
      value: n.id,
      key: n.id,
      children: n.children && n.children.length > 0 ? buildOrgTreeSelect(n.children) : undefined,
    }));
  };

  const fetchAuthList = async () => {
    if (!editingApp?.id) return;
    setAuthLoading(true);
    try {
      const res = await getAppAuthorizations(editingApp.id);
      if (res.code === 200) setAuthList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchOrgTree = async () => {
    try {
      const res = await getOrgList();
      if (res.code === 200) setOrgTreeData(buildOrgTreeSelect(res.data || []));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserListForPicker = async () => {
    setUserListLoading(true);
    try {
      const res = await getUserList({ page: 1, pageSize: 500 });
      if (res.code === 200 && res.data?.users) setUserList(res.data.users);
    } catch (e) {
      console.error(e);
    } finally {
      setUserListLoading(false);
    }
  };

  useEffect(() => {
    if (editingApp?.id && isModalOpen) {
      fetchAuthList();
      fetchOrgTree();
    }
  }, [editingApp?.id, isModalOpen]);

  useEffect(() => {
    if (addAuthType === 'user' && isModalOpen) fetchUserListForPicker();
  }, [addAuthType, isModalOpen]);

  const handleAddAuth = async () => {
    if (!editingApp?.id || !addAuthValue) {
      messageApi.warning('请选择要授权的对象');
      return;
    }
    try {
      const res = await addAppAuthorization({ app_id: editingApp.id, target_type: addAuthType, target_id: addAuthValue });
      if (res.code === 200) {
        messageApi.success('已添加授权');
        setAddAuthValue(null);
        fetchAuthList();
      } else {
        messageApi.error(res.msg || '添加失败');
      }
    } catch (e) {
      messageApi.error('添加失败');
    }
  };

  const handleRemoveAuth = async (id: string) => {
    try {
      const res = await deleteAppAuthorization(id);
      if (res.code === 200) {
        messageApi.success('已移除授权');
        fetchAuthList();
      } else {
        messageApi.error(res.msg || '移除失败');
      }
    } catch (e) {
      messageApi.error('移除失败');
    }
  };

  const authTypeLabel: Record<AppAuthTargetType, string> = { user: '个人', department: '部门', tenant: '租户（全部部门）' };

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

  const handleRotateSecret = async (appId?: string) => {
      const id = appId || editingApp?.id;
      if (!id) return;
      try {
          const res = await rotateAppSecret(id);
          if (res.code === 200) {
              messageApi.success('密钥已轮换');
              if (editingApp && editingApp.id === id) {
                setEditingApp(prev => prev ? ({...prev, app_secret: res.data.app_secret}) : null);
                form.setFieldValue('app_secret', res.data.app_secret);
              }
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

  const handleViewStats = async (appId: string, appName: string) => {
    setCurrentAppId(appId);
    setCurrentAppName(appName);
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
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgElevated: '#1a2632',
          colorBorder: '#233648',
          borderRadiusLG: 16,
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          colorPrimary: '#2563eb',
        },
        components: {
          Card: {
            colorBgContainer: '#1a2632',
          },
          Button: {
            borderRadius: 12,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 10,
            colorBgContainer: '#111a22',
          },
          Select: {
            borderRadius: 10,
            colorBgContainer: '#111a22',
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
                <RocketOutlined className="text-indigo-400 text-xl" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">App <span className="text-indigo-500">Access</span> Hub</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium ml-12">
              Application & API Key <span className="text-slate-600 mx-1">/</span> 企业级访问控制中心
            </p>
          </div>
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center bg-[#1a2632]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#233648] shadow-sm">
              <SafetyCertificateOutlined className="text-emerald-500 mr-2" />
              <span className="text-slate-300 text-xs font-bold tracking-wide uppercase">Secured</span>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate} 
              className="bg-indigo-600 hover:bg-indigo-500 border-0 rounded-xl h-10 px-6 font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              新建应用
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-indigo-500/30 transition-colors shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                <AppstoreOutlined style={{ fontSize: 80 }} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
               <div>
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">活跃应用数</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-white leading-none tracking-tight">{apps.filter(a => a.status === 0).length}</span>
                   <span className="text-slate-500 text-xs font-medium font-mono">/ {apps.length}</span>
                 </div>
               </div>
               <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                  <ApiOutlined className="text-indigo-400 text-2xl" />
               </div>
             </div>
          </div>

          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-emerald-500/30 transition-colors shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                <ThunderboltOutlined style={{ fontSize: 80 }} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
               <div>
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">今日总消耗 (Tokens)</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-white leading-none tracking-tight">
                     {apps.reduce((acc, a) => acc + (a.today_tokens || 0), 0).toLocaleString()}
                   </span>
                   <div className="flex items-center text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                     <ClockCircleOutlined className="mr-1" /> 24H
                   </div>
                 </div>
               </div>
               <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <ThunderboltOutlined className="text-emerald-400 text-2xl" />
               </div>
             </div>
          </div>

          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-amber-500/30 transition-colors shadow-sm relative overflow-hidden group">
             <div className="relative z-10">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">历史累计消耗</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white leading-none tracking-tight">
                    {apps.reduce((acc, a) => acc + (a.total_tokens || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tokens</span>
                </div>
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={apps.map(a => ({ value: a.total_tokens }))}>
                    <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             <div className="absolute top-5 right-5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <AreaChartOutlined className="text-amber-400 text-lg" />
             </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <Input 
              prefix={<SearchOutlined className="text-slate-500" />}
              placeholder="搜索应用名称或 App ID..."
              className="max-w-md bg-[#1a2632] border-[#233648] text-white hover:border-indigo-500/50 focus:border-indigo-500 h-10 rounded-xl"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onPressEnter={() => fetchApps()}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchApps()}
              className="bg-indigo-600 hover:bg-indigo-500 border-0 h-10 rounded-xl px-4"
            >
              搜索
            </Button>
            <Select
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setTimeout(() => fetchApps(), 0); }}
              className="w-36 h-10 custom-select"
              popupClassName="custom-dropdown"
              options={[
                { value: 'all', label: '所有状态' },
                { value: 0, label: '活跃应用' },
                { value: 1, label: '已禁用' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="刷新列表">
              <Button 
                icon={<SyncOutlined spin={loading} />} 
                className="bg-[#1a2632] border-[#233648] text-slate-400 hover:text-white hover:border-indigo-500/50 h-10 w-10 flex items-center justify-center rounded-xl" 
                onClick={fetchApps} 
              />
            </Tooltip>
          </div>
        </div>

        {/* App Card Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map(app => {
                let isAgent = false;
                try {
                    const kbs = JSON.parse(app.kb_config || '[]');
                    isAgent = kbs.length > 0;
                } catch(e) {}
                const fullKey = `${app.id}_${app.app_secret}`;

                return (
                  <div 
                    key={app.id}
                    className="p-5 rounded-2xl border transition-all bg-[#1a2632] border-[#233648] hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-900/20 group flex flex-col h-full relative overflow-hidden"
                  >
                    {/* Background Glow */}
                    <div className={`absolute -top-24 -right-24 size-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none ${
                      isAgent ? 'bg-indigo-500' : 'bg-blue-500'
                    }`}></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br border border-white/5 shadow-inner shadow-black/20 ${
                          app.avatar_bg || (isAgent ? 'from-indigo-600 to-indigo-900' : 'from-blue-600 to-blue-900')
                        }`}>
                          <span className="text-white font-black text-lg drop-shadow-md">
                            {app.avatar_text || app.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold truncate text-base tracking-tight" title={app.name}>{app.name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase border ${
                                app.status === 0 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                                {app.status === 0 ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                        <Tooltip title="配置详情">
                          <Button 
                            size="small" 
                            type="text" 
                            className="text-slate-400 hover:text-white hover:bg-white/5"
                            onClick={() => handleEdit(app)}
                            icon={<SettingOutlined className="text-base" />}
                          />
                        </Tooltip>
                        <Popconfirm title="确定要删除此应用吗？" onConfirm={() => handleDelete(app.id)}>
                            <Button 
                                danger
                                size="small" 
                                type="text"
                                icon={<DeleteOutlined className="text-base" />}
                                className="text-red-400/60 hover:text-red-400 hover:bg-red-400/5"
                            />
                        </Popconfirm>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5 relative z-10">
                      <Tag 
                        className={`m-0 text-[10px] border px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider flex items-center shadow-sm ${
                          isAgent 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {isAgent ? <ThunderboltFilled className="mr-1.5 text-[12px]" /> : <SyncOutlined className="mr-1.5 text-[12px]" />}
                        {isAgent ? 'Agent Mode' : 'Proxy Mode'}
                      </Tag>
                      {app.tenant_name && (
                        <Tag className="m-0 text-[10px] border bg-purple-500/10 text-purple-400 border-purple-500/20 px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider flex items-center shadow-sm">
                          <TeamOutlined className="mr-1.5 text-[12px]" /> {app.tenant_name}
                        </Tag>
                      )}
                    </div>

                    <div className="space-y-4 flex-1 relative z-10">
                      <div className="group/item">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60 group-hover/item:opacity-100 transition-opacity">App ID</span>
                          <Tooltip title="点击复制 ID">
                            <CopyOutlined 
                              className="text-slate-600 hover:text-indigo-400 cursor-pointer text-[11px] transition-colors" 
                              onClick={() => handleCopy(app.id)}
                            />
                          </Tooltip>
                        </div>
                        <div className="bg-[#111a22] px-3 py-2 rounded-xl border border-[#233648] text-slate-300 font-mono text-[11px] truncate select-all group-hover/item:border-indigo-500/30 transition-colors">
                          {app.id}
                        </div>
                      </div>

                      <div className="group/item">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60 group-hover/item:opacity-100 transition-opacity">App Secret</span>
                          <div className="flex gap-2.5">
                             <Tooltip title="复制完整密钥">
                                <CopyOutlined 
                                  className="text-slate-600 hover:text-indigo-400 cursor-pointer text-[11px] transition-colors" 
                                  onClick={() => handleCopy(fullKey)}
                                />
                             </Tooltip>
                             <Tooltip title="重置密钥令牌">
                                <Popconfirm title="重置后旧密钥将失效，确定继续吗？" onConfirm={() => handleRotateSecret(app.id)} okText="确定重置" cancelText="取消">
                                   <SyncOutlined className="text-slate-600 hover:text-amber-500 cursor-pointer text-[11px] transition-colors" />
                                </Popconfirm>
                             </Tooltip>
                          </div>
                        </div>
                        <div className="bg-[#111a22] px-3 py-2 rounded-xl border border-[#233648] text-slate-500 font-mono text-[11px] truncate group-hover/item:border-amber-500/30 transition-colors">
                          {app.app_secret ? `${fullKey.substring(0, 10)}****************` : '未配置密钥'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-white/5 relative z-10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                          <div className="text-[9px] text-emerald-500/60 font-black uppercase tracking-wider mb-1">今日消耗 (Tokens)</div>
                          <div className="text-emerald-400 font-mono font-black text-base leading-none">
                            {(Number(app.today_tokens) || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-slate-500/5 p-2 rounded-xl border border-white/5 text-right">
                          <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">配额使用进度</div>
                          <div className="text-slate-200 font-mono font-black text-sm leading-none">
                            {(() => {
                              const limit = Number(app.token_limit) || 0;
                              const used = Number(app.total_tokens) || 0;
                              if (limit <= 0) return 'UNLIMITED';
                              const pct = Math.min(100, Math.round((used / limit) * 100));
                              return `${pct}%`;
                            })()}
                          </div>
                          <div className="mt-1.5 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                    (Number(app.total_tokens) || 0) > (Number(app.token_limit) || 0) ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(100, (Number(app.total_tokens) || 0) / (Number(app.token_limit) || 1) * 100)}%` }}
                              ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 relative z-10">
                      <Button 
                        block 
                        size="middle" 
                        icon={<AreaChartOutlined />}
                        className="bg-[#1a2632] border-[#233648] text-slate-400 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-xs font-bold transition-all h-10"
                        onClick={() => handleViewStats(app.id, app.name)}
                      >
                        查看详细统计报表
                      </Button>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>

        {/* Edit App Modal */}
        <Modal
            open={isModalOpen}
            onCancel={handleModalClose}
            footer={null}
            width={720}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: 0, border: '1px solid #233648', backgroundColor: '#1a2632', borderRadius: '20px' }
            } as any}
            title={
                <div className="px-8 py-5 border-b border-[#233648] flex items-center gap-3">
                    <div className="bg-indigo-600/20 p-2 rounded-lg">
                        <EditOutlined className="text-indigo-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="text-white text-lg font-bold m-0">{editingApp ? '应用配置详情' : '创建企业级应用'}</h3>
                        <p className="text-slate-500 text-xs font-mono mt-0.5 mb-0">UID: {editingApp?.id || 'AUTO_GENERATED'}</p>
                    </div>
                </div>
            }
        >
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <Form layout="vertical" form={form} className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
                            <InfoCircleFilled /> 基础身份信息
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="name" label={<span className="text-slate-400 text-xs font-bold uppercase">应用显示名称</span>} rules={[{ required: true }]}>
                                <Input placeholder="例如: 智能客服助手" className="bg-[#111a22] border-[#233648] text-white h-11" />
                            </Form.Item>
                            <Form.Item name="status" label={<span className="text-slate-400 text-xs font-bold uppercase">运行状态</span>} valuePropName="checked">
                                <Switch checkedChildren="活跃" unCheckedChildren="停用" className="bg-slate-600 mt-2" />
                            </Form.Item>
                        </div>
                        <Form.Item name="description" label={<span className="text-slate-400 text-xs font-bold uppercase">功能描述</span>}>
                            <TextArea rows={3} placeholder="简要描述该应用的使用场景与业务价值..." className="bg-[#111a22] border-[#233648] text-white" />
                        </Form.Item>
                    </div>

                    {/* API Key Management */}
                    {editingApp && (
                        <div className="bg-[#111a22] p-6 rounded-2xl border border-[#233648] space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
                                    <LockOutlined /> 访问凭证安全
                                </div>
                                <Button size="small" icon={<SyncOutlined />} onClick={() => handleRotateSecret()} className="bg-amber-500/10 border-amber-500/20 text-amber-500 text-xs hover:bg-amber-500 hover:text-white">
                                    轮换密钥
                                </Button>
                            </div>
                            <div>
                                <div className="text-slate-500 text-[10px] mb-2 uppercase font-bold">App Secret (appid_secret)</div>
                                <Input.Password 
                                    readOnly
                                    value={`${editingApp.id}_${editingApp.app_secret}`}
                                    className="bg-black/20 border-[#233648] text-indigo-400 font-mono h-11"
                                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Authorization */}
                    {editingApp && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-black uppercase tracking-widest">
                                <TeamOutlined /> 访问控制 (ACL)
                            </div>
                            <div className="bg-[#111a22] p-5 rounded-2xl border border-[#233648]">
                                {authLoading ? (
                                    <div className="text-slate-500 text-xs py-4 flex items-center gap-2 justify-center"><SyncOutlined spin /> 同步授权列表中...</div>
                                ) : authList.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {authList.map((a) => (
                                            <Tag key={a.id} closable onClose={() => handleRemoveAuth(a.id)} className="bg-[#1a2632] border-[#233648] text-slate-300 py-1 px-3 rounded-lg flex items-center gap-2">
                                                <span className="text-[10px] text-indigo-500 font-bold uppercase">{authTypeLabel[a.target_type]}</span>
                                                {a.target_name}
                                            </Tag>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-xs py-4 text-center bg-black/10 rounded-xl mb-4 italic">未设置授权，此应用默认为全组织公开。</div>
                                )}
                                <div className="flex gap-2">
                                    <Select
                                        value={addAuthType}
                                        onChange={(v) => { setAddAuthType(v); setAddAuthValue(null); }}
                                        options={[
                                            { value: 'tenant', label: '所属租户' },
                                            { value: 'department', label: '特定部门' },
                                            { value: 'user', label: '具体人员' },
                                        ]}
                                        className="w-1/3 h-10"
                                    />
                                    <div className="flex-1 flex gap-2">
                                        {addAuthType === 'tenant' && (
                                            <Select
                                                placeholder="选择租户"
                                                value={addAuthValue}
                                                onChange={setAddAuthValue}
                                                className="flex-1 h-10"
                                                options={orgTreeData.map((n) => ({ value: n.value, label: n.title }))}
                                            />
                                        )}
                                        {addAuthType === 'department' && (
                                            <TreeSelect
                                                placeholder="选择授权部门"
                                                value={addAuthValue}
                                                onChange={setAddAuthValue}
                                                treeData={orgTreeData}
                                                className="flex-1 h-10"
                                                dropdownStyle={{ backgroundColor: '#1a2632' }}
                                            />
                                        )}
                                        {addAuthType === 'user' && (
                                            <Select
                                                showSearch
                                                placeholder="搜索用户姓名"
                                                value={addAuthValue}
                                                onChange={setAddAuthValue}
                                                loading={userListLoading}
                                                className="flex-1 h-10"
                                                options={userList.map((u) => ({ value: u.id, label: `${u.nickname || u.username}` }))}
                                            />
                                        )}
                                        <Button type="primary" onClick={handleAddAuth} className="bg-indigo-600 h-10">授权</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest">
                                <GlobalOutlined /> 服务交付模式
                            </div>
                            <Radio.Group 
                                value={isAgentEnabled ? 'agent' : 'proxy'} 
                                onChange={(e) => setIsAgentEnabled(e.target.value === 'agent')}
                                className="custom-radio-group"
                            >
                                <Radio.Button value="proxy">Proxy 转发</Radio.Button>
                                <Radio.Button value="agent">Agent 技能</Radio.Button>
                            </Radio.Group>
                        </div>
                        
                        {isAgentEnabled ? (
                            <div className="bg-indigo-600/5 p-5 rounded-2xl border border-indigo-500/20 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <Form.Item name="selected_kbs" label={<span className="text-slate-400 text-xs font-bold uppercase">绑定知识库技能</span>} className="mb-0">
                                    <TreeSelect
                                        treeData={kbTreeData}
                                        treeCheckable={true}
                                        showCheckedStrategy={TreeSelect.SHOW_PARENT}
                                        placeholder="选择该应用可调用的 Agent 技能知识库..."
                                        className="w-full"
                                        dropdownStyle={{ backgroundColor: '#1a2632' }}
                                    />
                                </Form.Item>
                                <div className="text-[10px] text-slate-500 italic"><InfoCircleOutlined className="mr-1" /> 勾选后，模型可以通过函数调用（Function Calling）自主检索这些库中的知识内容。</div>
                            </div>
                        ) : (
                            <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10 text-xs text-slate-400">
                                当前处于标准代理模式：模型请求将直接透明转发至后端厂商，不携带任何额外的 Agent 插件或知识库能力。
                            </div>
                        )}
                    </div>

                    {/* Quota & Models */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
                                <ThunderboltOutlined /> 配额与限流设置
                            </div>
                            <div className="bg-[#111a22] p-5 rounded-2xl border border-[#233648] space-y-4">
                                <Form.Item name="token_limit" label={<span className="text-slate-500 text-[10px] font-bold uppercase">总额度上限 (Tokens)</span>} className="mb-0">
                                    <InputNumber className="w-full h-10 bg-black/20" placeholder="0 表示无限制" />
                                </Form.Item>
                                <Form.Item name="daily_token_limit" label={<span className="text-slate-500 text-[10px] font-bold uppercase">单日消耗阈值</span>} className="mb-0">
                                    <InputNumber className="w-full h-10 bg-black/20" placeholder="0 表示无限制" />
                                </Form.Item>
                                <Form.Item name="qps_limit" label={<span className="text-slate-500 text-[10px] font-bold uppercase">并发 QPS 限制</span>} className="mb-0">
                                    <InputNumber className="w-full h-10 bg-black/20" placeholder="0 表示无限制" />
                                </Form.Item>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest">
                                <CloudFilled /> 模型访问策略
                            </div>
                            <div className="bg-[#111a22] p-5 rounded-2xl border border-[#233648] flex flex-col h-full">
                                <Form.Item name="selected_models" label={<span className="text-slate-500 text-[10px] font-bold uppercase">允许调用的白名单模型</span>} className="flex-1 mb-0">
                                    <Select
                                        mode="multiple"
                                        placeholder="请选择此应用有权访问的模型..."
                                        className="w-full min-h-[140px]"
                                        options={allAvailableModels}
                                        dropdownStyle={{ backgroundColor: '#1a2632' }}
                                    />
                                </Form.Item>
                                <div className="text-[9px] text-slate-600 mt-2 uppercase tracking-tighter">* 仅显示当前已激活的服务提供商模型</div>
                            </div>
                        </div>
                    </div>

                    {/* MCP Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
                            <ApiOutlined /> MCP 扩展工具集
                        </div>
                        <Form.Item name="selected_mcps" className="mb-0">
                            <Select
                                mode="multiple"
                                placeholder="选择该应用可接入的 MCP 协议工具..."
                                className="w-full"
                                options={mcpServers.map(s => ({
                                    label: `${s.name} (${s.type})`,
                                    value: s.id
                                }))}
                                dropdownStyle={{ backgroundColor: '#1a2632' }}
                            />
                        </Form.Item>
                    </div>
                </Form>

                <div className="flex justify-end gap-3 pt-6 border-t border-[#233648] mt-4">
                    <Button onClick={handleModalClose} className="bg-transparent border-[#334155] text-slate-400 hover:text-white h-11 px-8 rounded-xl">取消</Button>
                    <Button type="primary" onClick={handleSave} className="bg-indigo-600 h-11 px-10 font-bold rounded-xl shadow-lg shadow-indigo-600/20">
                        {editingApp ? '提交并保存' : '立即部署应用'}
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Stats Modal */}
        <Modal
            title={
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-primary/20 p-2 rounded-lg"><BarChartOutlined className="text-primary text-xl" /></div>
                    <div>
                        <div className="text-white font-bold text-lg leading-none">使用统计报表</div>
                        <div className="text-slate-500 text-xs font-mono mt-1">{currentAppName}</div>
                    </div>
                </div>
            }
            open={statsModalOpen}
            onCancel={() => setStatsModalOpen(false)}
            footer={null}
            width={960}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: '24px', border: '1px solid #233648', backgroundColor: '#1a2632', borderRadius: '24px' }
            } as any}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#111a22] p-4 rounded-2xl border border-[#233648]">
                    <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <InfoCircleOutlined className="text-indigo-500" />
                        分析该应用在选定周期内的模型粒度 Token 消耗及质量趋势
                    </div>
                    <DatePicker.RangePicker
                        value={statsDateRange}
                        onChange={handleStatsDateRangeChange}
                        format="YYYY-MM-DD"
                        allowClear={false}
                        className="bg-[#1a2632] border-[#233648] h-10 rounded-xl"
                    />
                </div>
            
                {statsLoading ? (
                    <div className="text-center py-20 flex flex-col items-center gap-3">
                        <SyncOutlined spin className="text-4xl text-indigo-500" />
                        <span className="text-slate-500 font-medium">深度解析数据中...</span>
                    </div>
                ) : modelStats.length === 0 ? (
                    <div className="text-center py-20 bg-[#111a22] rounded-3xl border border-dashed border-[#233648] flex flex-col items-center gap-3">
                        <div className="text-4xl">📊</div>
                        <span className="text-slate-500">该时间范围内暂无任何调用流水记录</span>
                    </div>
                ) : (
                    <div className="bg-[#111a22] rounded-2xl border border-[#233648] overflow-hidden">
                        <Table
                            columns={[
                                {
                                    title: '模型服务',
                                    dataIndex: 'model',
                                    key: 'model',
                                    render: (text: string) => (
                                        <div className="flex flex-col">
                                            <Text className="text-white font-bold">{text}</Text>
                                        </div>
                                    ),
                                },
                                {
                                    title: '接入厂商',
                                    dataIndex: 'provider_name',
                                    key: 'provider_name',
                                    render: (text: string) => <Tag className="bg-indigo-500/10 text-indigo-400 border-0 text-[10px] uppercase font-bold">{text}</Tag>,
                                },
                                {
                                    title: '调用频次',
                                    dataIndex: 'request_count',
                                    key: 'request_count',
                                    align: 'right' as const,
                                    render: (text: number) => <span className="text-slate-200 font-mono">{text?.toLocaleString() || 0} 次</span>,
                                },
                                {
                                    title: '输入 Tokens',
                                    dataIndex: 'prompt_tokens',
                                    key: 'prompt_tokens',
                                    align: 'right' as const,
                                    render: (text: number) => <span className="text-blue-400 font-mono">{text?.toLocaleString() || 0}</span>,
                                },
                                {
                                    title: '输出 Tokens',
                                    dataIndex: 'completion_tokens',
                                    key: 'completion_tokens',
                                    align: 'right' as const,
                                    render: (text: number) => <span className="text-emerald-400 font-mono">{text?.toLocaleString() || 0}</span>,
                                },
                                {
                                    title: '消耗占比',
                                    key: 'ratio',
                                    align: 'center' as const,
                                    render: (_: any, record: AppUsageStatsByModel) => {
                                        const total = modelStats.reduce((sum, s) => sum + s.total_tokens, 0);
                                        const percent = total > 0 ? Math.round((record.total_tokens / total) * 100) : 0;
                                        return (
                                            <div className="w-full flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 w-8">{percent}%</span>
                                            </div>
                                        );
                                    }
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
                                            <Badge status={parseFloat(rate) >= 95 ? "success" : "warning"} text={<span className={parseFloat(rate) >= 95 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{rate}%</span>} />
                                        );
                                    },
                                },
                            ]}
                            dataSource={modelStats}
                            rowKey="model"
                            pagination={false}
                            size="middle"
                            className="custom-table-modern"
                        />
                    </div>
                )}
            </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default AppsAndTokens;