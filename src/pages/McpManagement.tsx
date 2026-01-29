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
  ImportOutlined,
  AreaChartOutlined
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
  created_time?: string;
  tenant_id?: string;
  tenant_name?: string;
  latency?: number;
  today_calls?: number;
  total_calls?: number;
  last_inspect?: string;
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
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyAllServers = async () => {
    if (servers.length === 0) return;
    setIsVerifying(true);
    message.loading({ content: '正在同步各服务连接状态...', key: 'verify', duration: 0 });
    
    try {
        await Promise.allSettled(
            servers.map(s => inspectMcpServer(s.id))
        );
        message.success({ content: '所有服务状态已同步', key: 'verify' });
    } catch (e) {
        message.error({ content: '同步过程中出现错误', key: 'verify' });
    } finally {
        setIsVerifying(false);
        fetchServers();
    }
  };

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
                      created_time: s.created_time ?? s.createdTime ?? '',
                      tenant_id: s.tenant_id,
                      tenant_name: s.tenant_name,
                      icon: <RocketOutlined style={{ fontSize: 20, color: '#faad14' }} />, // Default icon
                      latency: s.latency || 0,
                      today_calls: s.today_calls || 0,
                      total_calls: s.total_calls || 0,
                      last_inspect: s.last_inspect,
                      latencyHistory: Array(20).fill(0).map(() => ({ value: (s.latency || 10) + Math.random() * 5 })),
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
    fetchServers().then(() => {
      // Auto verify after list is loaded
      verifyAllServers();
    });
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
        {/* Top Header */}
        <div className="flex justify-between items-end mb-2 px-1">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
                <RocketOutlined className="text-blue-400 text-xl" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">MCP <span className="text-blue-500">Service</span> Hub</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium ml-12">
              Model Context Protocol <span className="text-slate-600 mx-1">/</span> 全生命周期管理
            </p>
          </div>
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center bg-[#1a2632]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#233648] shadow-sm">
              <span className="relative flex h-2 w-2 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-slate-300 text-xs font-bold tracking-wide uppercase">Operational</span>
            </div>
            <Tooltip title="通知中心">
              <Button 
                type="text" 
                shape="circle"
                icon={<BellOutlined className="text-slate-400 text-lg" />} 
                className="hover:bg-[#1a2632]"
              />
            </Tooltip>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-blue-500/30 transition-colors shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                <CloudServerOutlined style={{ fontSize: 80 }} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
               <div>
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">在线服务器</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-white leading-none tracking-tight">{servers.filter(s => s.status === 'active').length}</span>
                   <span className="text-slate-500 text-xs font-medium font-mono">/ {servers.length}</span>
                 </div>
               </div>
               <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CloudServerOutlined className="text-blue-400 text-2xl" />
               </div>
             </div>
          </div>

          <div className="bg-[#1a2632] rounded-2xl p-5 border border-[#233648] hover:border-emerald-500/30 transition-colors shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                <ThunderboltOutlined style={{ fontSize: 80 }} className="text-white" />
             </div>
             <div className="relative z-10 flex items-center justify-between">
               <div>
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">今日调用次数</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-white leading-none tracking-tight">
                     {servers.reduce((acc, s) => acc + (s.today_calls || 0), 0).toLocaleString()}
                   </span>
                   <div className="flex items-center text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                     <PlusOutlined className="mr-0.5" /> 实时
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
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">平均响应时间</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white leading-none tracking-tight">
                    {Math.round(servers.filter(s => s.status === 'active' && s.latency > 0).reduce((acc, s, _, arr) => acc + s.latency / arr.length, 0)) || 0}
                  </span>
                  <span className="text-slate-400 text-sm font-bold">ms</span>
                </div>
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-60 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedServer?.latencyHistory || []}>
                    <defs>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             <div className="absolute top-5 right-5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <AreaChartOutlined className="text-amber-400 text-lg" />
             </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end items-center mb-2 px-1">
            <Button 
              icon={<ReloadOutlined spin={isVerifying} />} 
              onClick={verifyAllServers} 
              loading={isVerifying}
              className="bg-[#1a2632] border-[#334155] text-slate-300 hover:text-white hover:border-blue-500/50 rounded-xl h-10 px-5 font-medium transition-all"
            >
              一键验证状态
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchServers} 
              className="bg-[#1a2632] border-[#334155] text-slate-300 hover:text-white hover:border-blue-500/50 rounded-xl h-10 px-5 font-medium transition-all"
            >
              刷新列表
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddServer} 
              className="bg-blue-600 hover:bg-blue-500 border-0 rounded-xl h-10 px-6 font-bold shadow-lg shadow-blue-600/20 transition-all"
            >
              部署新服务
            </Button>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map(server => (
                <div 
                  key={server.id}
                  onClick={() => handleServerClick(server.id)}
                  className="p-5 rounded-2xl border cursor-pointer transition-all bg-[#1a2632] border-[#233648] hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/10 group relative flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#233648] to-[#111a22] border border-white/5 shadow-inner">
                        {typeof server.icon === 'string' ? (
                          <img src={server.icon} alt="" className="w-7 h-7 object-contain" />
                        ) : (
                          <div className="text-blue-400 group-hover:scale-110 transition-transform">
                            {React.cloneElement(server.icon as React.ReactElement, { style: { fontSize: 24 } })}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-semibold truncate text-base" title={server.name}>{server.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            server.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                            server.status === 'inactive' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {server.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <span className="bg-[#111a22] px-1.5 py-0.5 rounded text-[10px] uppercase text-blue-400/80 font-bold tracking-wider">{server.type}</span>
                          {server.tenant_name && (
                            <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {server.tenant_name}
                            </span>
                          )}
                          {server.version && <span className="opacity-60">v{server.version}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button 
                        size="small" 
                        type="text" 
                        className="text-slate-400 hover:text-white"
                        onClick={(e) => handleEditClick(e, server)}
                        icon={<SettingOutlined />}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    {server.description && (
                      <p className="text-slate-400 text-xs mb-4 line-clamp-2 leading-relaxed italic opacity-80">
                        "{server.description}"
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-auto border-t border-white/5 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Connected</span>
                        <div className="flex -space-x-1.5">
                          {server.connectedApps.length > 0 ? server.connectedApps.map((app, i) => (
                            <div key={i} className={`w-5 h-5 rounded-full ${app.color} flex items-center justify-center text-[8px] text-white font-bold border border-[#1a2632] shadow-sm`} title={app.name}>
                              {app.label}
                            </div>
                          )) : <div className="text-[10px] text-slate-600 font-mono">NONE</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">IDLE</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-3">
                        {server.id && (
                          <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">ID</span>
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[80px]" title={server.id}>
                              {server.id.substring(0, 8)}...
                            </span>
                          </div>
                        )}
                      </div>
                      {server.created_time && (
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">CREATED</span>
                          <span className="text-[10px] font-mono text-slate-500">{new Date(server.created_time).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    {server.last_inspect && (
                      <div className="flex items-center justify-end gap-1 opacity-30 text-[9px] font-mono">
                        <span className="uppercase">Last Check:</span>
                        <span>{server.last_inspect}</span>
                      </div>
                    )}
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
             <div className="px-8 py-6 border-b border-[#233648] flex justify-between items-center bg-gradient-to-r from-[#1a2632] to-[#111a22] rounded-t-2xl">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative group">
                      <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {typeof selectedServer.icon === 'string' ? (
                        <img src={selectedServer.icon} alt="" className="w-10 h-10 object-contain relative z-10" />
                      ) : (
                        <div className="text-blue-400 relative z-10">
                          {React.cloneElement(selectedServer.icon as React.ReactElement, { style: { fontSize: 32 } })}
                        </div>
                      )}
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-1.5">
                          <h2 className="text-2xl font-black text-white leading-none tracking-tight">{selectedServer.name}</h2>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            selectedServer.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {selectedServer.status}
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Endpoint</span>
                          <span className="text-xs text-blue-400 font-mono">
                            {selectedServer.type === 'stdio' 
                              ? `${selectedServer.command} ${selectedServer.args?.[0] || ''}` 
                              : selectedServer.url || 'N/A'}
                          </span>
                        </div>
                        <span className="text-slate-700 font-bold">·</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                          <span className="text-xs text-slate-400 font-medium">响应时间 {selectedServer.latency}ms</span>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        icon={<EditOutlined />} 
                        className="bg-[#233648] border-0 text-slate-300 hover:text-white rounded-xl"
                        onClick={(e) => {
                            setIsDetailModalOpen(false);
                            handleEditClick(e, selectedServer);
                        }}
                    >
                        编辑配置
                    </Button>
                    <Button 
                        icon={<ReloadOutlined spin={isVerifying} />} 
                        className="bg-blue-600/10 border-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl border-0"
                        onClick={() => handleServerClick(selectedServer.id)}
                        loading={isVerifying}
                    >
                        重连
                    </Button>
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
             <div className="bg-[#0d1319] border-t border-[#233648] px-8 py-4 flex justify-between items-center text-[10px] font-mono text-slate-500 rounded-b-2xl">
                  <div className="flex items-center gap-4">
                  {selectedServer.tenant_name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700 font-bold">TENANT</span>
                      <span className="text-purple-400 font-bold uppercase tracking-wider">{selectedServer.tenant_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-700 font-bold">UID</span>
                    <span className="text-slate-400 select-all tracking-wider">{selectedServer.id}</span>
                  </div>
                  <span className="text-slate-800">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-700 font-bold">DEPLOYED</span>
                    <span className="text-slate-400 uppercase">{selectedServer.created_time || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                     <span className="text-slate-700 font-bold uppercase tracking-widest">Type</span>
                     <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 text-[9px] font-black uppercase">{selectedServer.type}</span>
                   </div>
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
