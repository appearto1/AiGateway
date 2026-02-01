import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, 
  Select, 
  Switch, 
  Button, 
  Tag, 
  Form, 
  Modal,
  Tooltip,
  Popover,
  ConfigProvider,
  theme,
  message
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  ReloadOutlined, 
  DeleteOutlined, 
  HistoryOutlined, 
  CloudServerOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  ApiOutlined,
  CodeOutlined,
  WindowsOutlined,
  AppstoreFilled,
  KeyOutlined,
  SettingOutlined,
  LinkOutlined,
  LockOutlined,
  CloseOutlined, 
  LoadingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import StatusCard from '../components/StatusCard';
import { 
    getModelProviders, 
    createModelProvider, 
    updateModelProvider, 
    deleteModelProvider,
    testProviderConnection,
    getModelProviderStats
} from '../services/api';
import type { ModelProvider as APIModelProvider } from '../services/api';

// Mock Stats Data removed

interface Vendor {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 0 | 1 | 2; // 0:正常, 1:异常, 2:禁用
  latency?: string;
  successRate?: string;
  errorRate?: string;
  todayTokens?: number;
  totalTokens?: number;
  description?: string;
  tenantName?: string;
  models: string[];
  baseUrl: string;
  apiKey: string;
  iconBg: string;
  rawIcon?: string; // Store raw icon string for update
}

const getIcon = (name: string, bgClass?: string) => {
    const style = { fontSize: '20px', color: 'white' };
    const blackStyle = { fontSize: '20px', color: 'black' };
    
    // 规范化名称
    const n = name?.toLowerCase() || '';
    
    // 常用厂商预设图标
    if (n.includes('openai')) return <GlobalOutlined style={style} />;
    if (n.includes('anthropic')) return <ApiOutlined style={style} />;
    if (n.includes('ollama')) return <CodeOutlined style={blackStyle} />;
    if (n.includes('azure')) return <WindowsOutlined style={style} />;
    
    // 默认生成文字头像
    const firstChar = (name || '?').charAt(0).toUpperCase();
    return (
        <span className="text-white font-bold text-lg select-none tracking-tighter">
            {firstChar}
        </span>
    );
};

const COLORS = [
  { name: '蓝色', class: 'bg-blue-500' },
  { name: '靛蓝', class: 'bg-indigo-500' },
  { name: '紫色', class: 'bg-purple-500' },
  { name: '粉色', class: 'bg-pink-500' },
  { name: '橙色', class: 'bg-orange-500' },
  { name: '琥珀', class: 'bg-amber-500' },
  { name: '翠绿', class: 'bg-emerald-500' },
  { name: '青色', class: 'bg-cyan-500' },
  { name: '灰色', class: 'bg-slate-500' },
];

const ModelProviders: React.FC = () => {
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [isTesting, setIsTesting] = useState(false);
  
  const [stats, setStats] = useState({
    active_count: 0,
    total_count: 0,
    health: '0%',
    avg_latency: 0,
    today_calls: 0
  });

  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | number>('all');
  
  const [selectedColor, setSelectedColor] = useState('bg-blue-500');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Tag State
  const [editingModels, setEditingModels] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  // Form
  const [form] = Form.useForm();

  const fetchVendors = async (name?: string, status?: any) => {
    try {
        console.log("Fetching vendors with:", { name, status });
        
        // Parallel fetch for vendors and stats
        const [vendorsRes, statsRes] = await Promise.all([
            getModelProviders(name, status === 'all' ? undefined : status),
            getModelProviderStats()
        ]);

        if (statsRes.code === 200) {
            setStats(statsRes.data);
        }

        if (vendorsRes.code === 200 && Array.isArray(vendorsRes.data)) {
            const data: APIModelProvider[] = vendorsRes.data;
            const mapped: Vendor[] = data.map(p => {
                const name = p.name || 'Unknown';
                // 根据名字生成稳定的背景色
                const colors = [
                    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 
                    'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 
                    'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500'
                ];
                const colorIdx = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                const dynamicBg = p.icon_bg || colors[colorIdx];

                return {
                    id: p.id,
                    name: name,
                    status: p.status as any,
                    description: p.description,
                    latency: p.latency,
                    successRate: p.success_rate,
                    errorRate: p.error_rate,
                    todayTokens: p.today_tokens,
                    totalTokens: p.total_tokens,
                    tenantName: p.tenant_name,
                    baseUrl: p.base_url,
                    apiKey: p.api_key,
                    iconBg: dynamicBg,
                    models: p.models ? JSON.parse(p.models) : [],
                    icon: getIcon(name, dynamicBg),
                    rawIcon: p.icon
                };
            });
            setVendors(mapped);
        }
    } catch (e) {
        console.error(e);
        message.error("Failed to fetch vendors");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchVendors(searchText, statusFilter);
    }, 200); // 将防抖时间从 500ms 降低到 200ms
    return () => clearTimeout(timer);
  }, [searchText, statusFilter]);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  useEffect(() => {
    if (isModalOpen) {
      if (modalMode === 'edit' && selectedVendor) {
        setEditingModels(selectedVendor.models);
        setSelectedColor(selectedVendor.iconBg || 'bg-blue-500');
        form.setFieldsValue({
            name: selectedVendor.name,
            baseUrl: selectedVendor.baseUrl,
            apiKey: selectedVendor.apiKey,
        });
      } else {
        setEditingModels([]);
        setSelectedColor('bg-blue-500');
        form.resetFields();
      }
    }
  }, [isModalOpen, modalMode, selectedVendor, form]);

  const handleEditClick = (vendorId: string) => {
      setSelectedVendorId(vendorId);
      setModalMode('edit');
      setIsModalOpen(true);
  };

  const handleAddClick = () => {
      setSelectedVendorId('');
      setModalMode('add');
      setIsModalOpen(true);
  };

  const handleModalClose = () => {
      setIsModalOpen(false);
      setIsAddingTag(false);
      form.resetFields();
  };

  const handleSave = async () => {
      try {
          const values = await form.validateFields();
          const payload: Partial<APIModelProvider> = {
              name: values.name,
              base_url: values.baseUrl,
              api_key: values.apiKey,
              models: JSON.stringify(editingModels),
              icon: modalMode === 'edit' ? selectedVendor?.rawIcon || values.name : values.name, // Simple default
              icon_bg: selectedColor,
              status: modalMode === 'add' ? 0 : selectedVendor?.status,
          };

          if (modalMode === 'add') {
              const res = await createModelProvider(payload);
              if (res.code === 200) {
                  message.success("Created successfully");
                  fetchVendors(searchText, statusFilter);
                  handleModalClose();
              } else {
                  message.error(res.msg || "Creation failed");
              }
          } else {
              const res = await updateModelProvider({ ...payload, id: selectedVendorId });
              if (res.code === 200) {
                  message.success("Updated successfully");
                  fetchVendors(searchText, statusFilter);
                  handleModalClose();
              } else {
                  message.error(res.msg || "Update failed");
              }
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleTest = async () => {
    try {
        const values = await form.getFieldsValue(['baseUrl', 'apiKey']);
        if (!values.baseUrl) {
            message.warning("请先填写 BASE URL");
            return;
        }
        setIsTesting(true);
        const res = await testProviderConnection(values.baseUrl, values.apiKey, true);
        if (res.code === 200) {
            message.success("连接成功！接口响应正常");
        } else {
            message.error(res.msg || "连接测试失败");
        }
    } catch (e) {
        message.error("请求失败，请检查后端服务");
    } finally {
        setIsTesting(false);
    }
  };

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const handleStartAddTag = async () => {
    const values = await form.getFieldsValue(['baseUrl', 'apiKey']);
    if (values.baseUrl && values.apiKey) {
        setIsFetchingModels(true);
        try {
            const res = await testProviderConnection(values.baseUrl, values.apiKey, false);
            if (res.code === 200 && Array.isArray(res.models)) {
                setAvailableModels(res.models);
            } else {
                setAvailableModels([]);
            }
        } catch (e) {
            setAvailableModels([]);
        } finally {
            setIsFetchingModels(false);
        }
    } else {
        setAvailableModels([]);
    }
    setIsAddingTag(true);
  };
  
  const handleDelete = async () => {
      if (!selectedVendorId) return;

      modal.confirm({
          title: '确认删除',
          icon: <ExclamationCircleOutlined className="text-red-500" />,
          content: `确定要删除厂商 "${selectedVendor?.name}" 吗？此操作不可撤销。`,
          okText: '确认删除',
          okType: 'danger',
          cancelText: '取消',
          centered: true,
          onOk: async () => {
              try {
                  const res = await deleteModelProvider(selectedVendorId);
                  if (res.code === 200) {
                      message.success("删除成功");
                      fetchVendors(searchText, statusFilter);
                      handleModalClose();
                  } else {
                      message.error(res.msg || "删除失败");
                  }
              } catch (e) {
                  message.error("删除失败");
              }
          },
      });
  }

  // Tag Handlers
  const handleRemoveTag = (removedTag: string) => {
    setEditingModels(editingModels.filter(tag => tag !== removedTag));
  };

  const handleAddTag = (value: string) => {
    if (value && !editingModels.includes(value)) {
      setEditingModels([...editingModels, value]);
    }
    setIsAddingTag(false);
  };

  return (
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
              },
              Input: {
                  colorBgContainer: '#111a22',
                  colorBorder: '#233648',
                  hoverBorderColor: '#137fec',
                  activeBorderColor: '#137fec',
                  paddingBlock: 10,
                  paddingInline: 12,
              },
              Select: {
                  colorBgContainer: '#111a22',
                  colorBorder: '#233648',
                  hoverBorderColor: '#137fec',
                  activeBorderColor: '#137fec',
              }
          }
      }}
    >
      {contextHolder}
      <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">模型厂商管理</h2>
            <p className="text-slate-400 text-sm mt-1">
                管理并配置接入的 AI 模型供应商 (如 OpenAI, DeepSeek, Anthropic)，监控实时状态。
            </p>
        </div>
        <div className="flex gap-3">
            <Button 
                icon={<CodeOutlined />} 
                className="bg-[#1a2632] border-[#334155] text-slate-300 hover:text-white hover:border-primary"
                onClick={() => navigate('/admin/playground')}
            >
                模型测试
            </Button>
            <Button 
                icon={<ReloadOutlined />} 
                className="bg-[#1a2632] border-[#334155] text-slate-300 hover:text-white hover:border-primary"
                onClick={() => fetchVendors(searchText, statusFilter)}
            >
                刷新状态
            </Button>
            <Button 
                type="primary" 
                icon={<PlusOutlined />}
                className="bg-primary hover:bg-blue-600 border-none shadow-lg shadow-blue-900/20"
                onClick={handleAddClick}
            >
                添加模型
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard 
            title="活跃厂商"
            value={
                <div className="flex items-end gap-2">
                    <span>{stats.active_count}</span>
                    <span className="text-xs font-normal mb-1 text-green-500">
                        / {stats.total_count} Total
                    </span>
                </div>
            }
            icon={<CloudServerOutlined style={{ fontSize: '24px' }} className="text-primary" />}
            iconColorClass="bg-blue-500/10 border-blue-500/20"
            borderColorClass="bg-blue-500/10 border-blue-500/20"
        />
        <StatusCard 
            title="系统健康度"
            value={
                <div className="flex items-end gap-2">
                    <span>{stats.health}</span>
                    <span className="text-xs font-normal mb-1 text-green-500">Normal</span>
                </div>
            }
            icon={<SafetyCertificateOutlined style={{ fontSize: '24px' }} className="text-green-500" />}
            iconColorClass="bg-green-500/10 border-green-500/20"
            borderColorClass="bg-green-500/10 border-green-500/20"
        />
        <StatusCard 
            title="平均延迟"
            value={
                <div className="flex items-end gap-2">
                    <span>{stats.avg_latency}</span>
                    <span className="text-sm font-normal text-slate-400 mb-1">ms</span>
                </div>
            }
            icon={<DashboardOutlined style={{ fontSize: '24px' }} className="text-orange-400" />}
            iconColorClass="bg-orange-500/10 border-orange-500/20"
            borderColorClass="bg-orange-500/10 border-orange-500/20"
        />
        <StatusCard 
            title="今日调用"
            value={
                <div className="flex items-end gap-2">
                    <span>{stats.today_calls > 1000 ? (stats.today_calls/1000).toFixed(1) + 'k' : stats.today_calls}</span>
                    <span className="text-xs font-normal mb-1 text-slate-500">Since 00:00</span>
                </div>
            }
            icon={<BarChartOutlined style={{ fontSize: '24px' }} className="text-purple-400" />}
            iconColorClass="bg-purple-500/10 border-purple-500/20"
            borderColorClass="bg-purple-500/10 border-purple-500/20"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <Input 
            prefix={<SearchOutlined className="text-slate-500" />}
            placeholder="搜索厂商 (例如: DeepSeek, OpenAI)..."
            className="max-w-md bg-[#1a2632] border-[#334155] text-white placeholder-slate-500 hover:border-primary focus:border-primary"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-32"
            options={[
                { value: 'all', label: '所有状态' },
                { value: 0, label: '运行正常' },
                { value: 1, label: '连接异常' },
                { value: 2, label: '已禁用' },
            ]}
        />
      </div>

      {/* Vendor List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map(vendor => (
                <div 
                    key={vendor.id}
                    className="bg-[#1a2632] border border-[#233648] hover:border-primary/50 rounded-xl p-5 transition-all duration-200 group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${vendor.iconBg}`}>
                                    {vendor.icon}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">{vendor.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`size-1.5 rounded-full ${
                                            vendor.status === 0 ? 'bg-green-500' : 
                                            vendor.status === 1 ? 'bg-red-500' : 'bg-slate-500'
                                        }`}></span>
                                        <span className={`text-xs ${
                                            vendor.status === 0 ? 'text-green-500' : 
                                            vendor.status === 1 ? 'text-red-500' : 'text-slate-500'
                                        }`}>
                                            {vendor.status === 0 ? '运行正常' : 
                                            vendor.status === 1 ? '连接异常' : '已禁用'}
                                        </span>
                                    </div>
                                    {vendor.tenantName && (
                                        <div className="mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/80 font-bold tracking-wider uppercase">
                                                {vendor.tenantName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Switch 
                                size="small" 
                                checked={vendor.status !== 2} 
                                className={`${vendor.status === 2 ? 'bg-slate-600' : 'bg-primary'}`}
                                onChange={async (checked) => {
                                    try {
                                        const res = await updateModelProvider({
                                            id: vendor.id,
                                            status: checked ? 0 : 2
                                        });
                                        if (res.code === 200) {
                                            message.success(checked ? "已启用" : "已禁用");
                                            fetchVendors(searchText, statusFilter);
                                        } else {
                                            message.error(res.msg || "操作失败");
                                        }
                                    } catch (e) {
                                        message.error("操作失败");
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="bg-[#111a22] rounded p-2.5 border border-[#233648]">
                                <p className="text-slate-500 text-xs mb-0.5">当前延迟</p>
                                <div className="flex items-center text-slate-200 font-mono text-sm">
                                    <ThunderboltOutlined className={`mr-1.5 text-xs ${
                                        (() => {
                                            if (!vendor.latency || vendor.latency === '--' || vendor.latency === '-') return 'text-slate-500';
                                            const val = parseInt(vendor.latency);
                                            if (val < 100) return 'text-[#22c55e]'; // 深绿色 (Green 500)
                                            if (val < 200) return 'text-green-400'; // 绿色 (Green 400)
                                            return 'text-yellow-500'; // 黄色
                                        })()
                                    }`} />
                                    <span className={
                                        (() => {
                                            if (!vendor.latency || vendor.latency === '--' || vendor.latency === '-') return 'text-slate-400';
                                            const val = parseInt(vendor.latency);
                                            if (val < 100) return 'text-[#22c55e]'; 
                                            if (val < 200) return 'text-green-400';
                                            return 'text-yellow-500';
                                        })()
                                    }>
                                        {vendor.latency || '--'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-[#111a22] rounded p-2.5 border border-[#233648]">
                                <p className="text-slate-500 text-xs mb-0.5">
                                    {vendor.status === 1 ? '错误率' : '成功率'}
                                </p>
                                <div className={`font-mono text-sm ${vendor.status === 1 ? 'text-red-400' : 'text-slate-200'}`}>
                                    {vendor.status === 1 ? (vendor.errorRate || '--') : (vendor.successRate || '--')}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 font-mono mb-1 px-0.5">
                            <div className="flex items-center gap-1">
                                <span className="text-slate-600 uppercase">Today Tokens:</span>
                                <span className="text-slate-400">{vendor.todayTokens?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-600 uppercase">Total Tokens:</span>
                                <span className="text-slate-400">{vendor.totalTokens?.toLocaleString() || '0'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#233648] mt-1">
                        <span className="text-[10px] text-slate-600 font-mono truncate max-w-[150px]" title={vendor.id}>
                            ID: {vendor.id}
                        </span>
                        <Button 
                            type="text" 
                            size="small"
                            className="text-primary hover:text-white hover:bg-primary/20 flex items-center px-2"
                            onClick={() => handleEditClick(vendor.id)}
                        >
                            <SettingOutlined className="mr-1" /> 配置
                        </Button>
                    </div>
                </div>
            ))}
      </div>
    </div>

    <Modal
        open={isModalOpen}
            onCancel={handleModalClose}
            footer={null}
            width={480}
            closeIcon={null}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: 0, border: '1px solid #233648', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }
            }}
            title={
                <div className="flex justify-between items-center px-6 py-5 border-b border-[#233648]">
                    <div className="flex items-center gap-2.5">
                        <AppstoreFilled className="text-primary text-lg" />
                        <div>
                            <span className="text-white text-lg font-bold tracking-tight block">
                                {modalMode === 'add' ? '添加模型配置' : `配置 ${selectedVendor?.name}`}
                            </span>
                            {selectedVendor?.tenantName && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/80 font-bold tracking-wider uppercase">
                                    {selectedVendor.tenantName}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button 
                            type="text" 
                            icon={<HistoryOutlined className="text-lg" />} 
                            className="text-slate-400 hover:text-white flex items-center justify-center w-8 h-8"
                        />
                        <Button 
                            type="text" 
                            icon={<DeleteOutlined className="text-lg" />} 
                            className="text-slate-400 hover:text-red-400 flex items-center justify-center w-8 h-8"
                            onClick={handleDelete}
                        />
                    </div>
                </div>
            }
        >
            <div className="p-6">
                <Form form={form} layout="vertical" className="space-y-5">
                    <div className="flex gap-4">
                        <Form.Item name="name" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">显示名称</span>} className="mb-0 flex-1" rules={[{ required: true }]}>
                            <Input 
                                placeholder="例如: OpenAI, DeepSeek..."
                                className="text-white text-sm"
                            />
                        </Form.Item>
                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">标识颜色</span>} className="mb-0">
                            <Popover
                                open={isColorPickerOpen}
                                onOpenChange={setIsColorPickerOpen}
                                trigger="click"
                                placement="bottomRight"
                                overlayClassName="color-picker-popover"
                                content={
                                    <div className="grid grid-cols-5 gap-2 p-2">
                                        {COLORS.map(color => (
                                            <Tooltip title={color.name} key={color.class}>
                                                <div 
                                                    className={`size-7 rounded-md cursor-pointer transition-all ${color.class} ${selectedColor === color.class ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2632] scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}
                                                    onClick={() => {
                                                        setSelectedColor(color.class);
                                                        setIsColorPickerOpen(false);
                                                    }}
                                                />
                                            </Tooltip>
                                        ))}
                                    </div>
                                }
                            >
                                <div className="flex items-center justify-center size-10 bg-[#111a22] border border-[#233648] rounded-lg cursor-pointer hover:border-primary transition-colors group">
                                    <div className={`size-6 rounded-md shadow-sm ${selectedColor} group-hover:scale-110 transition-transform`} />
                                </div>
                            </Popover>
                        </Form.Item>
                    </div>
                    
                    <Form.Item name="baseUrl" label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">BASE URL</span>} className="mb-0">
                        <Input 
                            prefix={<LinkOutlined className="text-slate-500 mr-2" />}
                            placeholder="https://api.example.com/v1"
                            className="text-white font-mono text-xs"
                        />
                    </Form.Item>

                    <Form.Item 
                        name="apiKey" 
                        label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">API KEY</span>} 
                        className="mb-0"
                    >
                        <Input.Password 
                            prefix={<KeyOutlined className="text-slate-500 mr-2" />}
                            placeholder="输入 API 密钥..."
                            iconRender={(visible) => (
                                <span className="text-primary text-xs font-medium cursor-pointer hover:text-blue-400 select-none">
                                    {visible ? '隐藏' : '显示'}
                                </span>
                            )}
                            className="text-white font-mono text-xs pr-12"
                        />
                    </Form.Item>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px]">
                        <LockOutlined className="text-slate-500" />
                        密钥已加密存储
                    </div>

                    <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">可用模型</span>} className="mb-0">
                        <div className="flex flex-wrap gap-2">
                            {editingModels.map(model => (
                                <Tag 
                                    key={model} 
                                    closable
                                    closeIcon={<CloseOutlined className="text-slate-400 hover:text-white text-[10px]" />}
                                    onClose={() => handleRemoveTag(model)} 
                                    className="bg-[#111a22] border-[#233648] text-slate-200 mr-0 flex items-center px-3 py-1.5 rounded-md text-sm transition-all"
                                >
                                    {model}
                                </Tag>
                            ))}
                            {isAddingTag ? (
                                <Select
                                    showSearch
                                    autoFocus
                                    defaultOpen
                                    loading={isFetchingModels}
                                    placeholder={isFetchingModels ? "正在拉取模型..." : "输入或选择模型"}
                                    className="min-w-[140px]"
                                    size="small"
                                    onSelect={handleAddTag}
                                    onBlur={() => setIsAddingTag(false)}
                                    // Allow custom tags
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val) handleAddTag(val);
                                        }
                                    }}
                                    options={availableModels.filter(m => !editingModels.includes(m)).map(m => ({ label: m, value: m }))}
                                    dropdownStyle={{ backgroundColor: '#1a2632', border: '1px solid #233648' }}
                                />
                            ) : (
                                <Tag 
                                    onClick={handleStartAddTag}
                                    className="bg-transparent border-primary/30 text-primary border-dashed cursor-pointer hover:bg-primary/10 hover:border-primary px-3 py-1.5 rounded-md flex items-center gap-1 text-sm transition-colors"
                                >
                                    <PlusOutlined className="text-xs" /> 添加
                                </Tag>
                            )}
                        </div>
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#233648] mt-2">
                        <Button 
                            className="bg-[#1a2632] border-[#334155] text-slate-200 hover:text-white hover:border-slate-400 w-full h-11 text-sm font-medium rounded-lg"
                            icon={isTesting ? <LoadingOutlined /> : <ApiOutlined />}
                            onClick={handleTest}
                            disabled={isTesting}
                        >
                            {isTesting ? '测试中...' : '测试连接'}
                        </Button>
                        <Button 
                            type="primary" 
                            className="w-full h-11 text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20" 
                            onClick={handleSave}
                        >
                            {modalMode === 'add' ? '创建配置' : '保存配置'}
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
    </ConfigProvider>
  );
};

export default ModelProviders;
