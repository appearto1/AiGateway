import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Button, 
  Tabs, 
  Tag, 
  Badge, 
  ConfigProvider, 
  theme,
  Tooltip,
  Modal,
  Form,
  Select,
  Space,
  Radio,
  message,
  Card,
  Typography
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  ReloadOutlined, 
  CloudServerOutlined,
  AppstoreOutlined,
  FolderOpenOutlined,
  MessageOutlined,
  CloseCircleFilled,
  RightOutlined,
  SettingOutlined,
  BellOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CodeOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { 
    getMcpServers, 
    createMcpServer, 
    updateMcpServer, 
    deleteMcpServer,
    inspectMcpServer,
    executeMcpTool
} from '../services/api';

const { Search, TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

// Data Interfaces
interface McpTool {
  name: string;
  description: string;
  inputSchema?: any;
  args?: string; // Legacy
}

interface McpResource {
  uri: string;
  description: string;
}

interface McpPrompt {
  name: string;
  description: string;
}

interface McpEnv {
  [key: string]: string;
}

interface McpServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'streamable_http';
  command?: string; // for stdio
  args?: string[]; // for stdio
  env?: McpEnv; // for stdio
  url?: string; // for sse/streamable_http
  description?: string;
}

interface McpServer extends McpServerConfig {
  icon: React.ReactNode;
  version: string;
  status: 'active' | 'inactive' | 'error';
  latency: number;
  latencyHistory: { value: number }[];
  connectedApps: { name: string; color: string; label: string }[];
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
}

const McpManagement: React.FC = () => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Partial<McpServerConfig>>({});
  const [form] = Form.useForm();
  const [installMode, setInstallMode] = useState<'custom' | 'npm' | 'json'>('custom');
  const [searchText, setSearchText] = useState('');
  const [jsonConfig, setJsonConfig] = useState('');

  // Tool Testing State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testingTool, setTestingTool] = useState<McpTool | null>(null);
  const [testArgs, setTestArgs] = useState('{}');
  const [testResult, setTestResult] = useState<string>('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testMode, setTestMode] = useState<'form' | 'json'>('form');
  const [formParams] = Form.useForm();

  const selectedServer = servers.find(s => s.id === selectedServerId) || servers[0];

  const fetchServers = async () => {
      try {
          const res = await getMcpServers(searchText);
          if (res.code === 200) {
              const mappedServers = res.data.list.map((s: any) => {
                  let args = [];
                  try {
                      args = JSON.parse(s.args || '[]');
                  } catch (e) {}

                  let env = {};
                  try {
                      env = JSON.parse(s.env || '{}');
                  } catch (e) {}
                  
                  return {
                      id: s.id,
                      name: s.name,
                      type: s.type,
                      command: s.command,
                      args: args,
                      env: env,
                      url: s.url,
                      description: s.description,
                      status: s.status,
                      version: s.version,
                      icon: <RocketOutlined style={{ fontSize: 20, color: '#faad14' }} />, // Default icon
                      latency: 0, // Mock
                      latencyHistory: Array(20).fill(0).map(() => ({ value: 10 + Math.random() * 5 })), // Mock
                      connectedApps: [], // Mock
                      tools: [],
                      resources: [],
                      prompts: []
                  };
              });
              setServers(mappedServers);
          }
      } catch (e) {
          console.error("Failed to fetch servers", e);
          message.error("获取服务列表失败");
      }
  };

  useEffect(() => {
      fetchServers();
  }, [searchText]);

  useEffect(() => {
    if (isEditModalOpen && editingServer.id) {
       form.setFieldsValue({
           name: editingServer.name,
           type: editingServer.type,
           command: editingServer.command,
           args: editingServer.args?.join(' '),
           url: editingServer.url,
           env: Object.entries(editingServer.env || {}).map(([key, value]) => ({ key, value })),
           description: editingServer.description
       });
       setInstallMode('custom');
    } else if (isEditModalOpen && !editingServer.id) {
       form.resetFields();
       form.setFieldValue('type', 'stdio');
       setInstallMode('custom');
       setJsonConfig('');
    }
  }, [isEditModalOpen, editingServer, form]);

  const handleServerClick = async (id: string) => {
    setSelectedServerId(id);
    setIsDetailModalOpen(true);
    
    // Fetch detailed info (inspection)
    try {
        const res = await inspectMcpServer(id);
        if (res.code === 200) {
            setServers(prev => prev.map(s => {
                if (s.id === id) {
                    return {
                        ...s,
                        tools: res.data.tools || [],
                        resources: res.data.resources || [],
                        prompts: res.data.prompts || [],
                        status: res.data.status || s.status
                    };
                }
                return s;
            }));
        } else {
            message.error(res.msg || "Failed to inspect server tools");
        }
    } catch (e) {
        console.error("Failed to inspect server", e);
        message.error("Failed to connect to server");
    }
  };

  const handleEditClick = (e: React.MouseEvent, server: McpServer) => {
      e.stopPropagation();
      setEditingServer({
          id: server.id,
          name: server.name,
          type: server.type,
          command: server.command,
          args: server.args,
          env: server.env,
          url: server.url,
          description: server.description
      });
      setIsEditModalOpen(true);
  };

  const handleAddServer = () => {
      setEditingServer({});
      setIsEditModalOpen(true);
  };

  const handleSmartImport = () => {
      try {
          if (!jsonConfig.trim()) {
              message.warning("请先粘贴 JSON 配置");
              return;
          }

          const data = JSON.parse(jsonConfig);
          // Handle { mcpServers: { name: config } } format
          const servers = data.mcpServers || data; 
          const keys = Object.keys(servers);
          
          if (keys.length === 0) {
              message.error("JSON 中未找到服务器配置");
              return;
          }

          // We take the first server found
          const serverName = keys.includes('fetch') && keys.length === 1 ? keys[0] : keys[0];
          const config = servers[serverName];

          if (!config) {
              message.error("配置格式无效");
              return;
          }

          // Determine args
          let argsStr = '';
          if (Array.isArray(config.args)) {
              argsStr = config.args.join(' ');
          }

          // Determine env/headers
          let envList: any[] = [];
          if (config.env) {
              envList = [...envList, ...Object.entries(config.env).map(([k, v]) => ({ key: k, value: v }))];
          }
          if (config.headers) {
              // Map headers to env vars if backend doesn't support headers directly yet
              // Or if we want to store them as env vars
              // NOTE: Current backend implementation for StreamableHTTP doesn't read Env for headers
              // But we will store them there for now.
              envList = [...envList, ...Object.entries(config.headers).map(([k, v]) => ({ key: k, value: v }))];
          }

          form.setFieldsValue({
              name: serverName !== 'mcpServers' ? serverName : 'My MCP Server',
              type: config.type === 'uvx' ? 'stdio' : (config.type || 'stdio'), // uvx is a command, usually maps to stdio
              command: config.command || (config.type === 'uvx' ? 'uvx' : ''),
              args: argsStr,
              url: config.url,
              env: envList,
              description: `Imported from ${config.type || 'JSON'}`
          });
          
          if (config.command === 'uvx') {
              form.setFieldValue('type', 'stdio');
          }

          setInstallMode('custom');
          message.success("配置解析成功！请检查字段。");
      } catch (e) {
          console.error(e);
          message.error("JSON 解析失败，请检查格式。");
      }
  };

  const handleSave = async () => {
      try {
          const values = await form.validateFields();
          
          let args = [];
          if (values.type === 'stdio' && values.args) {
              args = values.args.split(' ').filter((a: string) => a.trim() !== '');
          }

          let env = {};
          if (values.env) {
              env = (values.env || []).reduce((acc: any, curr: any) => {
                  if (curr.key) acc[curr.key] = curr.value;
                  return acc;
              }, {});
          }

          const payload: any = {
              name: values.name,
              type: values.type,
              description: values.description,
              command: values.command,
              args: JSON.stringify(args),
              env: JSON.stringify(env),
              url: values.url
          };

          if (editingServer.id) {
              // Update existing
              payload.id = editingServer.id;
              const res = await updateMcpServer(payload);
              if (res.code === 200) {
                   message.success("配置更新成功");
                   fetchServers();
              } else {
                   message.error(res.msg || "更新失败");
              }
          } else {
              // Create new
              const res = await createMcpServer(payload);
              if (res.code === 200) {
                  message.success("新服务添加成功");
                  fetchServers();
              } else {
                  message.error(res.msg || "添加失败");
              }
          }
          setIsEditModalOpen(false);
      } catch (e) {
          console.error("Validation failed", e);
          message.error("验证失败");
      }
  };

  const handleDelete = async (id: string) => {
      Modal.confirm({
          title: '确认删除',
          content: '确定要移除此 MCP 服务配置吗？此操作不可撤销。',
          okType: 'danger',
          okText: '确认删除',
          cancelText: '取消',
          onOk: async () => {
              try {
                  const res = await deleteMcpServer(id);
                  if (res.code === 200) {
                      message.success("服务已移除");
                      fetchServers();
                      setIsDetailModalOpen(false);
                  } else {
                      message.error(res.msg || "删除失败");
                  }
              } catch (e) {
                  message.error("删除失败");
              }
          }
      });
  };

  const handleNpmPackageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const pkg = e.target.value;
      if (pkg) {
          form.setFieldsValue({
              name: pkg.split('/').pop() || pkg,
              command: 'npx',
              args: `-y ${pkg}`
          });
      }
  };

  // Tool Testing
  const handleTestTool = (tool: McpTool) => {
      setTestingTool(tool);
      setTestArgs('{}');
      setTestMode('form');
      
      // Auto-fill example args if available in schema
      if (tool.inputSchema && tool.inputSchema.properties) {
          const exampleArgs: any = {};
          Object.keys(tool.inputSchema.properties).forEach(key => {
              // Try to find default or example
              const prop = tool.inputSchema.properties[key];
              exampleArgs[key] = prop.default !== undefined ? prop.default : ""; 
          });
          setTestArgs(JSON.stringify(exampleArgs, null, 2));
          formParams.setFieldsValue(exampleArgs);
      } else {
          formParams.resetFields();
      }
      
      setTestResult('');
      setIsTestModalOpen(true);
  };

  const handleFormChange = (changedValues: any, allValues: any) => {
      setTestArgs(JSON.stringify(allValues, null, 2));
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setTestArgs(val);
      try {
          const parsed = JSON.parse(val);
          formParams.setFieldsValue(parsed);
      } catch (e) {
          // invalid json, ignore form sync
      }
  };

  const executeTest = async () => {
      if (!selectedServerId || !testingTool) return;
      
      setIsTestLoading(true);
      setTestResult('');
      
      try {
          let args = {};
          try {
              args = JSON.parse(testArgs);
          } catch (e) {
              message.error("参数必须是有效的 JSON");
              setIsTestLoading(false);
              return;
          }

          const res = await executeMcpTool(selectedServerId, testingTool.name, args);
          if (res.code === 200) {
              setTestResult(JSON.stringify(res.data, null, 2));
              if (res.data.isError) {
                  message.error("工具执行返回错误");
              } else {
                  message.success("工具执行成功");
              }
          } else {
              setTestResult(`Error: ${res.msg}\n\nDetails: ${JSON.stringify(res.data, null, 2)}`);
              message.error(res.msg || "执行失败");
          }
      } catch (e: any) {
          setTestResult(`Client Error: ${e.message}`);
          message.error("工具执行失败");
      } finally {
          setIsTestLoading(false);
      }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgElevated: '#1a2632',
          colorBorder: '#233648',
          borderRadiusLG: 8,
          fontFamily: 'Inter, sans-serif'
        },
      }}
    >
      <div className="h-full flex flex-col space-y-4">
        {/* Top Header */}
        <div className="flex justify-between items-center bg-[#111a22] p-1">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">MCP 服务管理中心</h1>
            <p className="text-slate-400 text-sm">管理 Model Context Protocol 服务实例与连接状态。</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#1a2632] px-3 py-1.5 rounded-full border border-[#233648] text-green-500 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              系统运行正常
            </div>
            <Button type="text" icon={<BellOutlined className="text-slate-400 text-lg" />} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 h-24">
          <div className="bg-[#1a2632] rounded-xl p-4 border border-[#233648] flex items-center justify-between">
             <div>
               <div className="text-slate-400 text-xs font-medium mb-1">在线服务器</div>
               <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold text-white">{servers.filter(s => s.status === 'active').length}</span>
                 <span className="text-green-500 text-xs">/ {servers.length} Total</span>
               </div>
             </div>
             <div className="bg-green-500/10 p-3 rounded-lg">
                <CloudServerOutlined className="text-green-500 text-xl" />
             </div>
          </div>
          <div className="bg-[#1a2632] rounded-xl p-4 border border-[#233648] flex items-center justify-between">
             <div>
               <div className="text-slate-400 text-xs font-medium mb-1">今日调用次数</div>
               <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold text-white">14,203</span>
                 <span className="text-blue-400 text-xs">+12.5%</span>
               </div>
             </div>
             <div className="bg-blue-500/10 p-3 rounded-lg">
                <AppstoreOutlined className="text-blue-500 text-xl" />
             </div>
          </div>
          <div className="bg-[#1a2632] rounded-xl p-4 border border-[#233648] relative overflow-hidden">
             <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-xs font-medium mb-1">平均延迟</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">45ms</span>
                  </div>
                </div>
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedServer?.latencyHistory || []}>
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
            <Button icon={<ReloadOutlined />} onClick={fetchServers} className="bg-[#1a2632] border-[#334155] text-slate-300">刷新状态</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddServer} className="bg-blue-600">添加新服务器</Button>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map(server => (
                <div 
                key={server.id}
                onClick={() => handleServerClick(server.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all bg-[#1a2632] border-[#233648] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 group relative`}
                >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white/5">
                        {typeof server.icon === 'string' ? <img src={server.icon} alt="" /> : server.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                        <span className="text-white font-bold truncate max-w-[120px]" title={server.name}>{server.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            server.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                            server.status === 'inactive' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 
                            'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                            {server.status.toUpperCase()}
                        </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                        <span className="bg-[#111a22] px-1.5 rounded uppercase">{server.type}</span>
                        <span>{server.version}</span>
                        </div>
                    </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                        {server.connectedApps.length > 0 ? server.connectedApps.map((app, i) => (
                            <div key={i} className={`w-5 h-5 rounded-full ${app.color} flex items-center justify-center text-[8px] text-white font-bold border border-[#1a2632]`} title={app.name}>
                            {app.label}
                            </div>
                        )) : <span className="text-xs text-slate-600 italic pl-1">Idle</span>}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            size="small" 
                            type="text" 
                            className="text-slate-400 hover:text-white"
                            onClick={(e) => handleEditClick(e, server)}
                        >
                            <SettingOutlined />
                        </Button>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>

        {/* Edit/Add Modal */}
        <Modal
            open={isEditModalOpen}
            onCancel={() => setIsEditModalOpen(false)}
            title={
                <div className="flex items-center gap-2 text-white border-b border-[#233648] pb-4 -mx-6 px-6">
                    {editingServer.id ? <EditOutlined /> : <PlusOutlined />}
                    <span>{editingServer.id ? '编辑服务器配置' : '添加新 MCP 服务器'}</span>
                </div>
            }
            footer={null}
            width={700}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: '24px', border: '1px solid #233648', backgroundColor: '#1a2632' }
            }}
        >
            {!editingServer.id && (
                 <div className="mb-6 bg-[#111a22] p-1 rounded-lg border border-[#233648] flex">
                    <Button 
                        type={installMode === 'custom' ? 'primary' : 'text'} 
                        className={`flex-1 ${installMode === 'custom' ? 'bg-blue-600' : 'text-slate-400'}`}
                        onClick={() => setInstallMode('custom')}
                    >
                        手动配置
                    </Button>
                    <Button 
                        type={installMode === 'npm' ? 'primary' : 'text'} 
                        className={`flex-1 ${installMode === 'npm' ? 'bg-blue-600' : 'text-slate-400'}`}
                        onClick={() => {
                            setInstallMode('npm');
                            form.setFieldValue('type', 'stdio');
                        }}
                    >
                        NPM 包
                    </Button>
                    <Button 
                        type={installMode === 'json' ? 'primary' : 'text'} 
                        className={`flex-1 ${installMode === 'json' ? 'bg-blue-600' : 'text-slate-400'}`}
                        onClick={() => setInstallMode('json')}
                    >
                        智能导入 (JSON)
                    </Button>
                 </div>
            )}

            {installMode === 'json' && !editingServer.id ? (
                <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-blue-300 text-xs">
                        在此粘贴您的 MCP 服务器配置 JSON。支持标准的 mcp-servers 格式。
                    </div>
                    <TextArea 
                        rows={10} 
                        value={jsonConfig}
                        onChange={(e) => setJsonConfig(e.target.value)}
                        placeholder={`{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-memory"]\n    }\n  }\n}`}
                        className="bg-[#111a22] border-[#233648] text-white font-mono text-xs"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-[#233648]">
                        <Button onClick={() => setIsEditModalOpen(false)} className="bg-transparent border-[#334155] text-slate-300">取消</Button>
                        <Button type="primary" onClick={handleSmartImport} icon={<ImportOutlined />} className="bg-blue-600">
                            解析并配置
                        </Button>
                    </div>
                </div>
            ) : (
                <Form form={form} layout="vertical" onFinish={handleSave} className="mt-2">
                    <Form.Item name="name" label="服务器名称" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Google Maps" className="bg-[#111a22] border-[#233648] text-white" />
                    </Form.Item>
                    
                    <Form.Item name="description" label="描述">
                        <Input placeholder="用途说明..." className="bg-[#111a22] border-[#233648] text-white" />
                    </Form.Item>

                    {installMode === 'npm' && !editingServer.id && (
                        <Form.Item label="NPM Package">
                             <Input 
                                placeholder="@modelcontextprotocol/server-postgres" 
                                onChange={handleNpmPackageChange}
                                prefix={<CodeOutlined />}
                                className="bg-[#111a22] border-[#233648] text-white"
                             />
                        </Form.Item>
                    )}

                    <Form.Item name="type" label="传输类型" rules={[{ required: true }]}>
                        <Select className="bg-[#111a22]" dropdownStyle={{ backgroundColor: '#1a2632' }} disabled={installMode === 'npm'}>
                            <Option value="stdio">Stdio (Local Process - npx/uvx/node/python)</Option>
                            <Option value="sse">SSE (Server-Sent Events - Deprecated)</Option>
                            <Option value="streamable_http">StreamableHTTP (Recommended for Remote)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                        {({ getFieldValue }) => {
                            const type = getFieldValue('type');
                            return (
                                <>
                                    {type === 'stdio' ? (
                                        <>
                                            <Form.Item name="command" label="命令 (Command)" rules={[{ required: true }]}>
                                                <Input placeholder="e.g. npx, python, uvx" className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                            </Form.Item>
                                            <Form.Item name="args" label="参数 (Arguments)">
                                                <TextArea placeholder="-y @modelcontextprotocol/server-postgres" className="bg-[#111a22] border-[#233648] text-white font-mono" rows={2} />
                                            </Form.Item>
                                        </>
                                    ) : (
                                        <Form.Item name="url" label="服务器地址 (URL)" rules={[{ required: true, type: 'url' }]}>
                                            <Input 
                                                placeholder={type === 'streamable_http' ? "https://example.com/mcp (or /message endpoint)" : "http://localhost:8080/sse"} 
                                                className="bg-[#111a22] border-[#233648] text-white font-mono" 
                                            />
                                        </Form.Item>
                                    )}

                                    <Form.Item label={type === 'stdio' ? "环境变量 (Environment Variables)" : "请求头 / 鉴权 (Headers / Auth)"}>
                                        <Form.List name="env">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    {fields.map(({ key, name, ...restField }) => (
                                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'key']}
                                                                rules={[{ required: true, message: 'Missing key' }]}
                                                            >
                                                                <Input placeholder={type === 'stdio' ? "KEY" : "Header Name (e.g. Authorization)"} className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                                            </Form.Item>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'value']}
                                                                rules={[{ required: true, message: 'Missing value' }]}
                                                            >
                                                                <Input placeholder={type === 'stdio' ? "VALUE" : "Header Value (e.g. Bearer token)"} className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                                            </Form.Item>
                                                            <DeleteOutlined onClick={() => remove(name)} className="text-red-500 cursor-pointer" />
                                                        </Space>
                                                    ))}
                                                    <Form.Item>
                                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="border-[#233648] text-slate-400">
                                                            {type === 'stdio' ? "添加变量" : "添加请求头"}
                                                        </Button>
                                                    </Form.Item>
                                                </>
                                            )}
                                        </Form.List>
                                    </Form.Item>
                                </>
                            );
                        }}
                    </Form.Item>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#233648]">
                         {editingServer.id && (
                            <Button 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    handleDelete(editingServer.id!);
                                }}
                                className="bg-red-500/10 border-red-500/20"
                            >
                                删除
                            </Button>
                         )}
                         <div className="flex-1"></div>
                         <Button onClick={() => setIsEditModalOpen(false)} className="bg-transparent border-[#334155] text-slate-300">取消</Button>
                         <Button type="primary" htmlType="submit" icon={<SaveOutlined />} className="bg-blue-600">保存配置</Button>
                    </div>
                </Form>
            )}
        </Modal>

        {/* Details Modal */}
        <Modal
            open={isDetailModalOpen}
            onCancel={() => setIsDetailModalOpen(false)}
            footer={null}
            width={800}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: 0, border: '1px solid #233648', backgroundColor: '#111a22' }
            }}
            title={null}
            closeIcon={<span className="text-slate-400 hover:text-white bg-black/20 rounded-full p-1"><CloseCircleFilled className="text-lg" /></span>}
        >
             {/* Inspector Header */}
             {selectedServer && (
             <>
             <div className="px-6 py-4 border-b border-[#233648] flex justify-between items-start bg-[#1a2632] rounded-t-lg">
                <div>
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">协议检查器</div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white p-1 flex items-center justify-center">
                        {typeof selectedServer.icon === 'string' ? <img src={selectedServer.icon} alt="" /> : selectedServer.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white leading-none">{selectedServer.name}</h2>
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<EditOutlined />} 
                                className="text-slate-500 hover:text-blue-400"
                                onClick={(e) => {
                                    setIsDetailModalOpen(false);
                                    handleEditClick(e, selectedServer);
                                }} 
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge status={selectedServer.status === 'active' ? 'success' : 'default'} />
                          <span className="text-xs text-green-500 font-mono">已连接</span>
                          <span className="text-xs text-slate-500 mx-1">|</span>
                          <span className="text-xs text-slate-400 font-mono">
                            {selectedServer.type === 'stdio' 
                              ? `${selectedServer.command} ${selectedServer.args?.[0]}...` 
                              : selectedServer.url || 'N/A'}
                          </span>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                       {selectedServer.tools.length + selectedServer.resources.length + selectedServer.prompts.length} 项
                    </div>
                </div>
             </div>
             
             <div className="p-0">
                <Tabs 
                    defaultActiveKey="1" 
                    className="custom-tabs-modal px-6"
                    items={[
                        {
                            key: '1',
                            label: '检查器 (Inspector)',
                            children: (
                                <div className="space-y-6 pb-6 pt-2 h-[500px] overflow-y-auto custom-scrollbar">
                                    {/* Tools Section */}
                                    <div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3">
                                        <SettingOutlined className="text-blue-500" />
                                        <span>暴露的工具</span>
                                        <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{selectedServer.tools.length}</span>
                                    </div>
                                    {selectedServer.tools.length > 0 ? (
                                        <div className="space-y-3">
                                        {selectedServer.tools.map((tool, idx) => (
                                            <div key={idx} className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-white font-bold flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                        {tool.name}
                                                        <Tag color="success" className="ml-2 text-[10px] border-0 bg-green-500/10 text-green-500">就绪</Tag>
                                                    </span>
                                                    <Button 
                                                        size="small" 
                                                        type="primary" 
                                                        icon={<PlayCircleOutlined />} 
                                                        className="bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white"
                                                        onClick={() => handleTestTool(tool)}
                                                    >
                                                        测试
                                                    </Button>
                                                </div>
                                                <p className="text-slate-400 text-sm mb-3">{tool.description}</p>
                                                
                                                {tool.inputSchema && (
                                                    <div className="mt-2">
                                                        <div className="text-xs text-slate-500 mb-1">参数:</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.keys(tool.inputSchema.properties || {}).map(prop => (
                                                                <span key={prop} className="text-xs font-mono bg-[#111a22] px-2 py-1 rounded text-slate-300 border border-[#233648]">
                                                                    {prop}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {tool.args && (
                                                    <div className="bg-[#111a22] rounded p-2 font-mono text-xs text-slate-300 border border-[#233648] mt-2">
                                                        <span className="text-purple-400">args:</span> {tool.args}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        </div>
                                    ) : <div className="text-slate-500 italic text-sm p-4 text-center">无暴露工具</div>}
                                    </div>

                                    {/* Resources Section */}
                                    <div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3">
                                        <FolderOpenOutlined className="text-amber-500" />
                                        <span>资源</span>
                                        <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{selectedServer.resources.length}</span>
                                    </div>
                                    {selectedServer.resources.length > 0 ? (
                                        <div className="space-y-3">
                                        {selectedServer.resources.map((res, idx) => (
                                            <div key={idx} className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                                <div className="font-mono text-white font-bold mb-1 flex items-center gap-2">
                                                <span className="text-slate-500"><RightOutlined className="text-[10px]" /></span>
                                                {res.uri}
                                                </div>
                                                <p className="text-slate-400 text-sm pl-5">{res.description}</p>
                                            </div>
                                        ))}
                                        </div>
                                    ) : <div className="text-slate-500 italic text-sm p-4 text-center">无暴露资源</div>}
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: '2', 
                            label: '配置详情',
                            children: (
                                <div className="py-4 space-y-4">
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                        <h3 className="text-slate-400 text-xs uppercase font-bold mb-3">传输设置</h3>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="text-slate-500">类型</div>
                                            <div className="col-span-2 text-white font-mono">{selectedServer.type}</div>
                                            
                                            {selectedServer.type === 'stdio' ? (
                                                <>
                                                    <div className="text-slate-500">命令</div>
                                                    <div className="col-span-2 text-white font-mono bg-[#111a22] p-2 rounded border border-[#233648]">{selectedServer.command}</div>
                                                    <div className="text-slate-500">参数</div>
                                                    <div className="col-span-2 text-white font-mono bg-[#111a22] p-2 rounded border border-[#233648] break-all">{selectedServer.args?.join(' ')}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-slate-500">URL</div>
                                                    <div className="col-span-2 text-white font-mono bg-[#111a22] p-2 rounded border border-[#233648]">{selectedServer.url}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {selectedServer.env && Object.keys(selectedServer.env).length > 0 && (
                                        <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                            <h3 className="text-slate-400 text-xs uppercase font-bold mb-3">
                                                {selectedServer.type === 'stdio' ? "环境变量" : "请求头 / 鉴权"}
                                            </h3>
                                            <div className="space-y-2">
                                                {Object.entries(selectedServer.env).map(([k, v]) => (
                                                    <div key={k} className="flex text-sm font-mono border-b border-[#233648] last:border-0 pb-2 last:pb-0">
                                                        <span className="text-purple-400 w-1/3 truncate" title={k}>{k}</span>
                                                        <span className="text-slate-300 w-2/3 truncate" title={v}>
                                                            {/* Mask sensitive values if they look like tokens */}
                                                            {k.toLowerCase().includes('auth') || k.toLowerCase().includes('token') || k.toLowerCase().includes('key') 
                                                                ? '********' 
                                                                : v}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    ]}
                />
             </div>

             {/* Footer Status Bar */}
             <div className="bg-[#0d1319] border-t border-[#233648] px-4 py-2 flex justify-between items-center text-xs font-mono text-slate-500 rounded-b-lg">
                <div>ID: {selectedServer.id}</div>
                <div className="flex items-center gap-2">
                  <span>延迟: {selectedServer.latency}ms</span>
                  <span className={`w-2 h-2 rounded-full ${selectedServer.latency < 50 ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </div>
             </div>
             </>
             )}
        </Modal>

        {/* Test Tool Modal */}
        <Modal
            open={isTestModalOpen}
            onCancel={() => setIsTestModalOpen(false)}
            title={
                <div className="flex items-center gap-2 text-white border-b border-[#233648] pb-4 -mx-6 px-6">
                    <PlayCircleOutlined className="text-blue-500" />
                    <span>测试工具: <span className="font-mono text-blue-300">{testingTool?.name}</span></span>
                </div>
            }
            footer={null}
            width={700}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: '24px', border: '1px solid #233648', backgroundColor: '#1a2632' }
            }}
        >
            <div className="space-y-4">
                <div className="flex justify-end mb-2">
                    <Radio.Group 
                        value={testMode} 
                        onChange={e => setTestMode(e.target.value)} 
                        size="small"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="form">表单模式</Radio.Button>
                        <Radio.Button value="json">JSON 模式</Radio.Button>
                    </Radio.Group>
                </div>

                {testMode === 'form' && testingTool?.inputSchema?.properties ? (
                    <div className="bg-[#111a22] p-4 rounded border border-[#233648] max-h-[300px] overflow-y-auto custom-scrollbar">
                        <Form form={formParams} layout="vertical" onValuesChange={handleFormChange}>
                            {Object.entries(testingTool.inputSchema.properties).map(([key, prop]: [string, any]) => (
                                <Form.Item 
                                    key={key} 
                                    label={<span className="text-slate-300 font-mono text-xs">{key}</span>}
                                    name={key}
                                    tooltip={prop.description}
                                    required={testingTool.inputSchema.required?.includes(key)}
                                    className="mb-3"
                                >
                                    {prop.type === 'boolean' ? (
                                        <Select className="w-full" dropdownStyle={{ backgroundColor: '#1a2632' }}>
                                            <Option value={true}>True</Option>
                                            <Option value={false}>False</Option>
                                        </Select>
                                    ) : (
                                        <Input placeholder={prop.description || `Enter ${key}`} className="bg-[#1a2632] border-[#233648] text-white" />
                                    )}
                                </Form.Item>
                            ))}
                        </Form>
                    </div>
                ) : (
                    <div>
                        <div className="text-slate-400 text-xs font-medium mb-2">输入参数 (JSON)</div>
                        <TextArea 
                            rows={8}
                            value={testArgs}
                            onChange={handleJsonChange}
                            className="bg-[#111a22] border-[#233648] text-white font-mono text-xs"
                        />
                    </div>
                )}

                {testingTool?.inputSchema && testMode === 'json' && (
                         <div className="mt-2 bg-[#111a22] p-2 rounded border border-[#233648]">
                             <div className="text-[10px] text-slate-500 mb-1 uppercase">Schema 定义</div>
                             <pre className="text-[10px] text-slate-400 overflow-x-auto custom-scrollbar max-h-[100px]">
                                 {JSON.stringify(testingTool.inputSchema, null, 2)}
                             </pre>
                         </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button 
                        type="primary" 
                        icon={isTestLoading ? <ThunderboltOutlined spin /> : <PlayCircleOutlined />} 
                        onClick={executeTest}
                        loading={isTestLoading}
                        className="bg-blue-600 w-full"
                    >
                        运行工具
                    </Button>
                </div>

                {testResult && (
                    <div className="mt-4 pt-4 border-t border-[#233648]">
                         <div className="text-slate-400 text-xs font-medium mb-2">执行结果</div>
                         <div className={`bg-[#0d1319] p-3 rounded-lg border ${testResult.includes('"isError": true') ? 'border-red-500/30' : 'border-[#233648]'} overflow-auto max-h-[300px]`}>
                             <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{testResult}</pre>
                         </div>
                    </div>
                )}
            </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default McpManagement;
