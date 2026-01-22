import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, 
  Select, 
  Switch, 
  Button, 
  Tag, 
  Typography, 
  Form, 
  Divider,
  Modal,
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
  EyeInvisibleOutlined,
  EyeOutlined,
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
  CloseOutlined
} from '@ant-design/icons';
import StatusCard from '../components/StatusCard';

// Mock Data
const statsData = [
  {
    title: '活跃厂商',
    value: '8',
    subValue: '+1',
    icon: <CloudServerOutlined style={{ fontSize: '24px' }} className="text-primary" />,
    iconColorClass: 'bg-blue-500/10 border-blue-500/20',
    subValueClass: 'text-green-500'
  },
  {
    title: '系统健康度',
    value: '98.5%',
    subValue: 'Normal',
    icon: <SafetyCertificateOutlined style={{ fontSize: '24px' }} className="text-green-500" />,
    iconColorClass: 'bg-green-500/10 border-green-500/20',
    subValueClass: 'text-green-500'
  },
  {
    title: '平均延迟 (P95)',
    value: '112',
    unit: 'ms',
    icon: <DashboardOutlined style={{ fontSize: '24px' }} className="text-orange-400" />,
    iconColorClass: 'bg-orange-500/10 border-orange-500/20',
    subValueClass: ''
  },
  {
    title: '今日调用',
    value: '45.2k',
    subValue: 'Since 00:00',
    icon: <BarChartOutlined style={{ fontSize: '24px' }} className="text-purple-400" />,
    iconColorClass: 'bg-purple-500/10 border-purple-500/20',
    subValueClass: 'text-slate-500'
  }
];

// Predefined models for selection
const COMMON_MODELS = [
  'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo',
  'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku',
  'deepseek-chat', 'deepseek-coder',
  'gemini-1.5-pro', 'gemini-1.5-flash',
  'llama-3-70b', 'llama-3-8b',
  'mistral-large', 'mixtral-8x7b'
];

interface Vendor {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'active' | 'error' | 'disabled';
  latency?: string;
  successRate?: string;
  errorRate?: string;
  description?: string;
  models: string[];
  baseUrl: string;
  apiKey: string;
  iconBg: string;
}

const initialVendors: Vendor[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: <div className="size-full bg-blue-500 rounded-lg"></div>,
    status: 'active',
    latency: '45ms',
    successRate: '99.9%',
    description: 'dpsk-v2-prod',
    models: ['deepseek-chat', 'deepseek-coder'],
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-xxxxxxxxxxxxxxxx',
    iconBg: 'bg-blue-500'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <GlobalOutlined style={{ fontSize: '24px', color: 'white' }} />,
    status: 'active',
    latency: '230ms',
    successRate: '99.5%',
    models: ['gpt-4o', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-proj-xxxxxxxx',
    iconBg: 'bg-black'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: <ApiOutlined style={{ fontSize: '24px', color: 'white' }} />,
    status: 'active',
    latency: '156ms',
    successRate: '99.8%',
    models: ['claude-3-5-sonnet', 'claude-3-opus'],
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: 'sk-ant-xxxxxxxx',
    iconBg: 'bg-orange-600'
  },
  {
    id: 'ollama',
    name: 'Local Ollama',
    icon: <CodeOutlined style={{ fontSize: '24px', color: 'black' }} />,
    status: 'error',
    latency: '--',
    errorRate: '100%',
    models: ['llama3', 'mistral'],
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    iconBg: 'bg-white'
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    icon: <WindowsOutlined style={{ fontSize: '24px', color: 'white' }} />,
    status: 'disabled',
    latency: '-',
    successRate: '-',
    models: ['gpt-4', 'gpt-35-turbo'],
    baseUrl: 'https://my-resource.openai.azure.com',
    apiKey: 'xxxxxxxx',
    iconBg: 'bg-blue-800'
  }
];

const ModelProviders: React.FC = () => {
  const navigate = useNavigate();
  const [vendors] = useState<Vendor[]>(initialVendors);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('deepseek');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  
  // Tag State
  const [editingModels, setEditingModels] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const selectRef = useRef<any>(null);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  // Initialize editing state when opening modal
  useEffect(() => {
    if (isModalOpen) {
      if (modalMode === 'edit') {
        setEditingModels(selectedVendor.models);
      } else {
        setEditingModels([]);
      }
    }
  }, [isModalOpen, modalMode, selectedVendor]);

  const handleEditClick = (vendorId: string) => {
      setSelectedVendorId(vendorId);
      setModalMode('edit');
      setIsModalOpen(true);
  };

  const handleAddClick = () => {
      setModalMode('add');
      setIsModalOpen(true);
  };

  const handleModalClose = () => {
      setIsModalOpen(false);
      setIsAddingTag(false);
  };

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
                onClick={() => navigate('/playground')}
            >
                模型测试
            </Button>
            <Button 
                icon={<ReloadOutlined />} 
                className="bg-[#1a2632] border-[#334155] text-slate-300 hover:text-white hover:border-primary"
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
        {statsData.map((stat, index) => (
            <StatusCard 
                key={index}
                title={stat.title}
                value={
                    <div className="flex items-end gap-2">
                        <span>{stat.value}</span>
                        {stat.unit && <span className="text-sm font-normal text-slate-400 mb-1">{stat.unit}</span>}
                        {stat.subValue && <span className={`text-xs font-normal mb-1 ${stat.subValueClass}`}>{stat.subValue}</span>}
                    </div>
                }
                icon={stat.icon}
                iconColorClass={stat.iconColorClass}
                borderColorClass={stat.iconColorClass}
            />
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <Input 
            prefix={<SearchOutlined className="text-slate-500" />}
            placeholder="搜索厂商 (例如: DeepSeek, OpenAI)..."
            className="max-w-md bg-[#1a2632] border-[#334155] text-white placeholder-slate-500 hover:border-primary focus:border-primary"
        />
        <Select
            defaultValue="all"
            className="w-32"
            options={[
                { value: 'all', label: '所有状态' },
                { value: 'active', label: '运行正常' },
                { value: 'error', label: '连接异常' },
                { value: 'disabled', label: '已禁用' },
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
                                            vendor.status === 'active' ? 'bg-green-500' : 
                                            vendor.status === 'error' ? 'bg-red-500' : 'bg-slate-500'
                                        }`}></span>
                                        <span className={`text-xs ${
                                            vendor.status === 'active' ? 'text-green-500' : 
                                            vendor.status === 'error' ? 'text-red-500' : 'text-slate-500'
                                        }`}>
                                            {vendor.status === 'active' ? '运行正常' : 
                                            vendor.status === 'error' ? '连接断时' : '已禁用'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Switch 
                                size="small" 
                                checked={vendor.status !== 'disabled'} 
                                className={`${vendor.status === 'disabled' ? 'bg-slate-600' : 'bg-primary'}`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-[#111a22] rounded p-2.5 border border-[#233648]">
                                <p className="text-slate-500 text-xs mb-0.5">当前延迟</p>
                                <div className="flex items-center text-slate-200 font-mono text-sm">
                                    <ThunderboltOutlined className="text-yellow-500 mr-1.5 text-xs" />
                                    {vendor.latency}
                                </div>
                            </div>
                            <div className="bg-[#111a22] rounded p-2.5 border border-[#233648]">
                                <p className="text-slate-500 text-xs mb-0.5">
                                    {vendor.status === 'error' ? '错误率' : '成功率'}
                                </p>
                                <div className={`font-mono text-sm ${vendor.status === 'error' ? 'text-red-400' : 'text-slate-200'}`}>
                                    {vendor.status === 'error' ? vendor.errorRate : vendor.successRate}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#233648] mt-2">
                        {vendor.description ? (
                             <span className="text-xs text-slate-500 font-mono">ID: {vendor.description}</span>
                        ) : <span></span>}
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

      {/* Modal Section */}
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
                        <span className="text-white text-lg font-bold tracking-tight">
                            {modalMode === 'add' ? '添加模型配置' : `配置 ${selectedVendor?.name}`}
                        </span>
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
                        />
                    </div>
                </div>
            }
        >
            <div className="p-6">
                <Form layout="vertical" className="space-y-5">
                    <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">显示名称</span>} className="mb-0">
                        <Input 
                            placeholder="例如: OpenAI, DeepSeek..."
                            defaultValue={modalMode === 'edit' ? selectedVendor?.name : ''} 
                            className="text-white text-sm"
                        />
                    </Form.Item>
                    
                    <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">BASE URL</span>} className="mb-0">
                        <Input 
                            prefix={<LinkOutlined className="text-slate-500 mr-2" />}
                            placeholder="https://api.example.com/v1"
                            defaultValue={modalMode === 'edit' ? selectedVendor?.baseUrl : ''} 
                            className="text-white font-mono text-xs"
                        />
                    </Form.Item>

                    <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">API KEY</span>} className="mb-0">
                        <div className="relative">
                            <Input.Password 
                                prefix={<KeyOutlined className="text-slate-500 mr-2" />}
                                placeholder="输入 API 密钥..."
                                defaultValue={modalMode === 'edit' ? selectedVendor?.apiKey : ''} 
                                iconRender={(visible) => (
                                    <span className="text-primary text-xs font-medium cursor-pointer hover:text-blue-400 select-none">
                                        {visible ? '隐藏' : '显示'}
                                    </span>
                                )}
                                className="text-white font-mono text-xs pr-12"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-[11px]">
                            <LockOutlined className="text-slate-500" />
                            密钥已加密存储
                        </div>
                    </Form.Item>

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
                                    placeholder="输入或选择模型"
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
                                    options={COMMON_MODELS.filter(m => !editingModels.includes(m)).map(m => ({ label: m, value: m }))}
                                    dropdownStyle={{ backgroundColor: '#1a2632', border: '1px solid #233648' }}
                                />
                            ) : (
                                <Tag 
                                    onClick={() => setIsAddingTag(true)}
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
                            icon={<ApiOutlined />}
                        >
                            测试连接
                        </Button>
                        <Button 
                            type="primary" 
                            className="w-full h-11 text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20" 
                            onClick={handleModalClose}
                        >
                            {modalMode === 'add' ? '创建配置' : '保存配置'}
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
      </ConfigProvider>
    </div>
  );
};

export default ModelProviders;
