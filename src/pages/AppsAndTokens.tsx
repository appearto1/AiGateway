import React, { useState } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Table, 
  Tag, 
  Typography, 
  Space, 
  Tooltip,
  Pagination,
  ConfigProvider,
  theme,
  Modal,
  Form,
  Switch,
  Divider,
  Checkbox
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  FilterOutlined, 
  ExportOutlined, 
  EditOutlined, 
  KeyOutlined, 
  FileTextOutlined,
  InfoCircleOutlined,
  InfoCircleFilled,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SafetyCertificateFilled,
  AppstoreFilled,
  ThunderboltFilled,
  DatabaseFilled,
  CloudFilled,
  GlobalOutlined,
  CodeOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;

// Mock Data for Applications
interface AppData {
  key: string;
  name: string;
  updatedAt: string;
  appId: string;
  status: 'active' | 'disabled';
  models: string[];
  tokenUsage: string;
  avatarText: string;
  avatarBg: string;
  description?: string;
  appSecret?: string;
}

const mockApps: AppData[] = [
  {
    key: '1',
    name: '智能客服 Bot',
    updatedAt: '更新于 2 小时前',
    appId: 'app_8f7a29...9a2',
    status: 'active',
    models: ['gpt-4', 'claude-2', '+2'],
    tokenUsage: '1, 450, 230',
    avatarText: 'CS',
    avatarBg: 'bg-blue-500',
    description: '专用于对接官方网站及移动端 App 的自动化客户服务机器人。',
    appSecret: 'sk-****************************8f2'
  },
  {
    key: '2',
    name: '数据分析 Tool',
    updatedAt: '更新于 1 天前',
    appId: 'app_3x2b11...8c4',
    status: 'active',
    models: ['text-embedding-ada-002'],
    tokenUsage: '850, 125',
    avatarText: 'DA',
    avatarBg: 'bg-purple-600',
    description: '内部数据分析平台使用的 AI 助手。',
    appSecret: 'sk-****************************3b4'
  },
  {
    key: '3',
    name: '测试环境 App (Dev)',
    updatedAt: '更新于 5 天前',
    appId: 'app_9k1m55...2d9',
    status: 'disabled',
    models: ['gpt-3.5-turbo'],
    tokenUsage: '12, 405',
    avatarText: 'TE',
    avatarBg: 'bg-slate-600',
    description: '开发团队用于测试新功能的沙盒环境。',
    appSecret: 'sk-****************************9d1'
  },
  {
    key: '4',
    name: 'Marketing Copilot',
    updatedAt: '更新于 3 小时前',
    appId: 'app_7j2k99...1x5',
    status: 'active',
    models: ['dall-e-3', 'gpt-4-vision'],
    tokenUsage: '325, 890',
    avatarText: 'MK',
    avatarBg: 'bg-orange-500',
    description: '市场部用于生成营销文案和配图的创意工具。',
    appSecret: 'sk-****************************7x5'
  }
];

const AppsAndTokens: React.FC = () => {
  const [loading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppData | null>(null);

  const handleEdit = (app: AppData) => {
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingApp(null);
  };

  const columns = [
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: AppData) => (
        <div className="flex items-center gap-3 py-1">
          <div className={`size-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0 ${record.avatarBg}`}>
            {record.avatarText}
          </div>
          <div className="flex flex-col">
            <Text className="text-white font-medium text-sm">{record.name}</Text>
            <Text className="text-slate-500 text-[10px]">{record.updatedAt}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'APP ID',
      dataIndex: 'appId',
      key: 'appId',
      render: (text: string) => (
        <Text className="bg-[#111a22] text-slate-400 px-2 py-1 rounded font-mono text-xs border border-[#233648]">
          {text}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${
          status === 'active' 
          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
          : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
        }`}>
          <span className={`size-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
          {status === 'active' ? '活跃' : '已停用'}
        </div>
      ),
    },
    {
      title: '授权模型',
      dataIndex: 'models',
      key: 'models',
      render: (models: string[]) => (
        <div className="flex flex-wrap gap-1.5">
          {models.map(model => (
            <Tag 
              key={model} 
              className="bg-[#1a2632] border-[#233648] text-slate-400 text-[10px] m-0 px-2"
            >
              {model}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '总 TOKEN 用量',
      dataIndex: 'tokenUsage',
      key: 'tokenUsage',
      align: 'right' as const,
      render: (text: string) => (
        <Text className="text-slate-200 font-mono text-sm">{text}</Text>
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
            <Button type="text" icon={<KeyOutlined className="text-slate-400 hover:text-white" />} size="small" />
          </Tooltip>
          <Tooltip title="调用日志">
            <Button type="text" icon={<FileTextOutlined className="text-slate-400 hover:text-white" />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
          onClick={() => {
            setEditingApp(null);
            setIsModalOpen(true);
          }}
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
          />
          <Select
            defaultValue="all"
            className="w-32 h-10"
            options={[
              { value: 'all', label: '所有状态' },
              { value: 'active', label: '活跃' },
              { value: 'disabled', label: '已停用' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<FilterOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 h-10 px-4">筛选</Button>
          <Button icon={<ExportOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 h-10 px-4">导出</Button>
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
            dataSource={mockApps} 
            pagination={false}
            loading={loading}
            className="custom-table"
          />
        </ConfigProvider>
        
        {/* Custom Pagination Footer */}
        <div className="p-6 flex flex-wrap items-center justify-between border-t border-[#233648]">
          <Text className="text-slate-500 text-sm">显示 1 到 4 条，共 12 条记录</Text>
          <Pagination 
            defaultCurrent={1} 
            total={30} 
            showSizeChanger={false}
            className="custom-pagination"
          />
        </div>
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
                content: { padding: 0, border: '1px solid #233648' }
            }}
            title={
                <div className="px-6 py-5 border-b border-[#233648] flex items-center gap-3">
                    <EditOutlined className="text-primary text-xl" />
                    <div>
                        <h3 className="text-white text-lg font-bold m-0">编辑应用详情</h3>
                        <p className="text-slate-500 text-xs font-mono mt-0.5 mb-0">App ID: {editingApp?.appId || 'new_app_...'}</p>
                    </div>
                </div>
            }
        >
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <Form layout="vertical" className="space-y-6">
                    {/* Section: Basic Info */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <InfoCircleFilled className="text-primary" />
                            <span className="text-white font-bold">基础信息</span>
                        </div>
                        
                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用名称</span>} className="mb-0">
                            <Input 
                                placeholder="输入应用名称"
                                defaultValue={editingApp?.name} 
                                className="text-white"
                            />
                        </Form.Item>
                        
                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用描述</span>} className="mb-0">
                            <TextArea 
                                rows={3}
                                placeholder="简要描述应用用途..."
                                defaultValue={editingApp?.description}
                                className="text-white"
                            />
                        </Form.Item>

                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用状态</span>} className="mb-0">
                            <div className="flex items-center gap-3">
                                <Switch defaultChecked={editingApp?.status === 'active'} className="bg-slate-600" />
                                <span className="text-slate-300 text-sm">活跃</span>
                            </div>
                        </Form.Item>
                    </div>

                    {/* Section: API Key Management */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <KeyOutlined className="text-primary" />
                            <span className="text-white font-bold">API Key 管理</span>
                        </div>

                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">应用密钥 (App Secret)</span>} className="mb-0">
                            <div className="flex gap-3">
                                <Input.Password 
                                    defaultValue={editingApp?.appSecret}
                                    placeholder="sk-..."
                                    className="text-white font-mono flex-1"
                                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                />
                                <Button icon={<SyncOutlined />} className="bg-[#111a22] border-[#233648] text-slate-300 hover:text-white h-[42px] px-4">
                                    轮换密钥
                                </Button>
                            </div>
                        </Form.Item>

                        <Form.Item label={<span className="text-slate-400 text-xs font-bold uppercase tracking-wider">密钥过期设置</span>} className="mb-0">
                            <Select
                                defaultValue="never"
                                className="w-full h-10"
                                options={[
                                    { value: 'never', label: '从不' },
                                    { value: '30d', label: '30 天' },
                                    { value: '90d', label: '90 天' },
                                    { value: '180d', label: '180 天' },
                                ]}
                            />
                        </Form.Item>
                    </div>

                    {/* Section: Model Permissions */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <SafetyCertificateFilled className="text-primary" />
                            <span className="text-white font-bold">模型权限</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-3">OpenAI</Text>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-3 flex items-center justify-between hover:border-primary/30 transition-colors">
                                        <Text className="text-slate-300 text-sm">gpt-4o</Text>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-3 flex items-center justify-between hover:border-primary/30 transition-colors">
                                        <Text className="text-slate-300 text-sm">gpt-4-turbo</Text>
                                        <Checkbox defaultChecked />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-3">DeepSeek</Text>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-3 flex items-center justify-between hover:border-primary/30 transition-colors">
                                        <Text className="text-slate-300 text-sm">deepseek-chat</Text>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-3 flex items-center justify-between hover:border-primary/30 transition-colors opacity-60">
                                        <Text className="text-slate-300 text-sm">deepseek-coder</Text>
                                        <Checkbox />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Knowledge Base & MCP Services */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CloudFilled className="text-primary" />
                            <span className="text-white font-bold">知识库与 MCP 服务</span>
                        </div>
                        
                        <p className="text-slate-500 text-xs">配置应用可访问的外部知识库或 MCP (Model Context Protocol) 扩展能力。</p>

                        <div className="space-y-4">
                            <div>
                                <Text className="text-slate-400 text-xs font-medium block mb-3">企业知识库</Text>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#1a2632] border border-primary/50 rounded-lg p-4 flex items-center justify-between group cursor-pointer ring-1 ring-primary/20">
                                        <div className="flex items-center gap-3">
                                            <DatabaseFilled className="text-primary text-xl" />
                                            <div className="flex flex-col">
                                                <Text className="text-white text-sm font-medium">产品 FAQ 库</Text>
                                                <Text className="text-slate-500 text-[10px]">已接入 2.4k 文档</Text>
                                            </div>
                                        </div>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors opacity-60">
                                        <div className="flex items-center gap-3">
                                            <DatabaseFilled className="text-slate-600 text-xl" />
                                            <div className="flex flex-col">
                                                <Text className="text-slate-300 text-sm font-medium">内部技术指南</Text>
                                                <Text className="text-slate-600 text-[10px]">仅限 R&D 团队</Text>
                                            </div>
                                        </div>
                                        <Checkbox />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Text className="text-slate-400 text-xs font-medium block mb-3">MCP 工具插件</Text>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#1a2632] border border-primary/50 rounded-lg p-4 flex items-center justify-between group cursor-pointer ring-1 ring-primary/20">
                                        <div className="flex items-center gap-3">
                                            <GlobalOutlined className="text-primary text-xl" />
                                            <div className="flex flex-col">
                                                <Text className="text-white text-sm font-medium">实时谷歌搜索</Text>
                                                <Text className="text-slate-500 text-[10px]">MCP-Search-Adapter</Text>
                                            </div>
                                        </div>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <div className="bg-[#1a2632] border border-primary/50 rounded-lg p-4 flex items-center justify-between group cursor-pointer ring-1 ring-primary/20">
                                        <div className="flex items-center gap-3">
                                            <CodeOutlined className="text-primary text-xl" />
                                            <div className="flex flex-col">
                                                <Text className="text-white text-sm font-medium">Python 代码执行</Text>
                                                <Text className="text-slate-500 text-[10px]">MCP-Sandbox-v1</Text>
                                            </div>
                                        </div>
                                        <Checkbox defaultChecked />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Quota & Rate Limits */}
                    <div className="bg-[#111a22]/50 border border-[#233648] rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <ThunderboltFilled className="text-primary" />
                            <span className="text-white font-bold">额度与频率限制</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item label={<span className="text-slate-400 text-xs font-medium">总 Token 额度</span>} className="mb-0">
                                <Input 
                                    defaultValue="10000000" 
                                    suffix={<span className="text-slate-600 text-xs">Tokens</span>}
                                    className="text-white font-mono"
                                />
                            </Form.Item>
                            <Form.Item label={<span className="text-slate-400 text-xs font-medium">每日限额</span>} className="mb-0">
                                <Input 
                                    defaultValue="500000" 
                                    suffix={<span className="text-slate-600 text-xs">Tokens</span>}
                                    className="text-white font-mono"
                                />
                            </Form.Item>
                            <Form.Item label={<span className="text-slate-400 text-xs font-medium">QPS 限制</span>} className="mb-0">
                                <Input 
                                    defaultValue="10" 
                                    suffix={<span className="text-slate-600 text-xs">Req/s</span>}
                                    className="text-white font-mono"
                                />
                            </Form.Item>
                        </div>
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
                        onClick={handleModalClose}
                        className="bg-primary hover:bg-blue-600 border-none h-10 px-8 font-bold rounded-lg shadow-lg shadow-blue-900/20"
                    >
                        保存更改
                    </Button>
                </div>
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
