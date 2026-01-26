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
  message
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
  RocketOutlined
} from '@ant-design/icons';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const { Search, TextArea } = Input;
const { Option } = Select;

// Data Interfaces
interface McpTool {
  name: string;
  description: string;
  args: string;
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
  type: 'stdio' | 'sse';
  command?: string; // for stdio
  args?: string[]; // for stdio
  env?: McpEnv; // for stdio
  url?: string; // for sse
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

// Initial Mock Data
const INITIAL_SERVERS: McpServer[] = [
  {
    id: 'srv_8a92b3',
    name: 'Google Search MCP',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: { GOOGLE_MAPS_API_KEY: '******' },
    description: 'Provides Google Maps search capabilities',
    icon: <GlobalOutlined style={{ fontSize: 20, color: '#4285F4' }} />,
    version: 'v1.2.0',
    status: 'active',
    latency: 45,
    latencyHistory: Array(20).fill(0).map(() => ({ value: 30 + Math.random() * 30 })),
    connectedApps: [
      { name: 'App A', color: 'bg-blue-500', label: 'A' },
      { name: 'App B', color: 'bg-purple-500', label: 'B' },
    ],
    tools: [
      { name: 'google_search', description: 'Execute a Google search query', args: '{ query: string }' },
      { name: 'get_search_trends', description: 'Retrieve current search trends', args: '{ region?: string }' }
    ],
    resources: [
      { uri: 'google://search/history', description: 'Read-only access to past search query history.' }
    ],
    prompts: []
  },
  {
    id: 'srv_db92a1',
    name: 'PostgreSQL Adapter',
    type: 'sse',
    url: 'http://localhost:8080/sse',
    description: 'Connects to local PostgreSQL instance',
    icon: <div className="bg-blue-600 p-1.5 rounded flex items-center justify-center text-white font-bold text-xs">PG</div>,
    version: 'v9.4',
    status: 'active',
    latency: 12,
    latencyHistory: Array(20).fill(0).map(() => ({ value: 10 + Math.random() * 5 })),
    connectedApps: [
      { name: 'Worker', color: 'bg-indigo-500', label: 'W' },
    ],
    tools: [
      { name: 'query', description: 'Execute SQL query', args: '{ sql: string }' }
    ],
    resources: [],
    prompts: []
  }
];

const McpManagement: React.FC = () => {
  const [servers, setServers] = useState<McpServer[]>(INITIAL_SERVERS);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Partial<McpServerConfig>>({});
  const [form] = Form.useForm();
  const [installMode, setInstallMode] = useState<'custom' | 'npm'>('custom');

  const selectedServer = servers.find(s => s.id === selectedServerId) || servers[0];

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
    }
  }, [isEditModalOpen, editingServer, form]);

  const handleServerClick = (id: string) => {
    setSelectedServerId(id);
    setIsDetailModalOpen(true);
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

  const handleSave = async () => {
      try {
          const values = await form.validateFields();
          
          let newServerConfig: any = {
              name: values.name,
              type: values.type,
              description: values.description
          };

          if (values.type === 'stdio') {
              newServerConfig.command = values.command;
              newServerConfig.args = values.args ? values.args.split(' ') : [];
              newServerConfig.env = (values.env || []).reduce((acc: any, curr: any) => {
                  if (curr.key) acc[curr.key] = curr.value;
                  return acc;
              }, {});
          } else {
              newServerConfig.url = values.url;
          }

          if (editingServer.id) {
              // Update existing
              setServers(prev => prev.map(s => s.id === editingServer.id ? { ...s, ...newServerConfig } : s));
              message.success("Server configuration updated");
          } else {
              // Create new
              const newServer: McpServer = {
                  ...newServerConfig,
                  id: `srv_${Math.random().toString(36).substr(2, 6)}`,
                  status: 'inactive', // Default to inactive until connected
                  version: 'v0.0.1',
                  latency: 0,
                  latencyHistory: [],
                  connectedApps: [],
                  tools: [],
                  resources: [],
                  prompts: [],
                  icon: <RocketOutlined style={{ fontSize: 20, color: '#faad14' }} />
              };
              setServers(prev => [...prev, newServer]);
              message.success("New MCP Server added");
          }
          setIsEditModalOpen(false);
      } catch (e) {
          console.error("Validation failed", e);
      }
  };

  const handleDelete = (id: string) => {
      Modal.confirm({
          title: 'Confirm Delete',
          content: 'Are you sure you want to remove this MCP server configuration?',
          okType: 'danger',
          onOk: () => {
              setServers(prev => prev.filter(s => s.id !== id));
              message.success("Server removed");
              setIsDetailModalOpen(false);
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
              System Operational
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
            <Button icon={<ReloadOutlined />} className="bg-[#1a2632] border-[#334155] text-slate-300">刷新状态</Button>
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
            width={600}
            className="custom-modal"
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
                content: { padding: '24px', border: '1px solid #233648', backgroundColor: '#1a2632' }
            }}
        >
            <Form form={form} layout="vertical" onFinish={handleSave} className="mt-2">
                {!editingServer.id && (
                    <div className="mb-6 bg-[#111a22] p-3 rounded-lg border border-[#233648]">
                        <Radio.Group 
                            value={installMode} 
                            onChange={e => {
                                setInstallMode(e.target.value);
                                if (e.target.value === 'npm') {
                                    form.setFieldValue('type', 'stdio');
                                }
                            }}
                            className="w-full flex"
                            buttonStyle="solid"
                        >
                            <Radio.Button value="custom" className="flex-1 text-center">Custom Config</Radio.Button>
                            <Radio.Button value="npm" className="flex-1 text-center">NPM Package (npx)</Radio.Button>
                        </Radio.Group>
                    </div>
                )}

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
                        <Option value="stdio">Stdio (Local Process)</Option>
                        <Option value="sse">SSE (Server-Sent Events)</Option>
                    </Select>
                </Form.Item>

                <Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                    {({ getFieldValue }) => {
                        const type = getFieldValue('type');
                        return type === 'stdio' ? (
                            <>
                                <Form.Item name="command" label="Command" rules={[{ required: true }]}>
                                    <Input placeholder="e.g. npx, python, uvx" className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                </Form.Item>
                                <Form.Item name="args" label="Arguments">
                                    <TextArea placeholder="-y @modelcontextprotocol/server-postgres" className="bg-[#111a22] border-[#233648] text-white font-mono" rows={2} />
                                </Form.Item>
                                <Form.Item label="Environment Variables">
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
                                                            <Input placeholder="KEY" className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'value']}
                                                            rules={[{ required: true, message: 'Missing value' }]}
                                                        >
                                                            <Input placeholder="VALUE" className="bg-[#111a22] border-[#233648] text-white font-mono" />
                                                        </Form.Item>
                                                        <DeleteOutlined onClick={() => remove(name)} className="text-red-500 cursor-pointer" />
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="border-[#233648] text-slate-400">
                                                        Add Variable
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                </Form.Item>
                            </>
                        ) : (
                            <Form.Item name="url" label="Server URL" rules={[{ required: true, type: 'url' }]}>
                                <Input placeholder="http://localhost:8080/sse" className="bg-[#111a22] border-[#233648] text-white font-mono" />
                            </Form.Item>
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
                            Delete
                        </Button>
                     )}
                     <div className="flex-1"></div>
                     <Button onClick={() => setIsEditModalOpen(false)} className="bg-transparent border-[#334155] text-slate-300">Cancel</Button>
                     <Button type="primary" htmlType="submit" icon={<SaveOutlined />} className="bg-blue-600">Save Configuration</Button>
                </div>
            </Form>
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
             <div className="px-6 py-4 border-b border-[#233648] flex justify-between items-start bg-[#1a2632] rounded-t-lg">
                <div>
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Protocol Inspector</div>
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
                          <span className="text-xs text-green-500 font-mono">CONNECTED</span>
                          <span className="text-xs text-slate-500 mx-1">|</span>
                          <span className="text-xs text-slate-400 font-mono">{selectedServer.type === 'stdio' ? `${selectedServer.command} ${selectedServer.args?.[0]}...` : selectedServer.url}</span>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                       {selectedServer.tools.length + selectedServer.resources.length + selectedServer.prompts.length} Items
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
                            label: 'Inspector',
                            children: (
                                <div className="space-y-6 pb-6 pt-2">
                                    {/* Tools Section */}
                                    <div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3">
                                        <SettingOutlined className="text-blue-500" />
                                        <span>Exposed Tools</span>
                                        <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{selectedServer.tools.length}</span>
                                    </div>
                                    {selectedServer.tools.length > 0 ? (
                                        <div className="space-y-3">
                                        {selectedServer.tools.map((tool, idx) => (
                                            <div key={idx} className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-white font-bold">{tool.name}</span>
                                                </div>
                                                <p className="text-slate-400 text-sm mb-3">{tool.description}</p>
                                                <div className="bg-[#111a22] rounded p-2 font-mono text-xs text-slate-300 border border-[#233648]">
                                                <span className="text-purple-400">args:</span> {tool.args}
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : <div className="text-slate-500 italic text-sm p-4 text-center">No tools exposed</div>}
                                    </div>

                                    {/* Resources Section */}
                                    <div>
                                    <div className="flex items-center gap-2 text-white font-bold mb-3">
                                        <FolderOpenOutlined className="text-amber-500" />
                                        <span>Resources</span>
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
                                    ) : <div className="text-slate-500 italic text-sm p-4 text-center">No resources exposed</div>}
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: '2', 
                            label: 'Configuration',
                            children: (
                                <div className="py-4 space-y-4">
                                    <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                        <h3 className="text-slate-400 text-xs uppercase font-bold mb-3">Transport Settings</h3>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="text-slate-500">Type</div>
                                            <div className="col-span-2 text-white font-mono">{selectedServer.type}</div>
                                            
                                            {selectedServer.type === 'stdio' ? (
                                                <>
                                                    <div className="text-slate-500">Command</div>
                                                    <div className="col-span-2 text-white font-mono bg-[#111a22] p-2 rounded border border-[#233648]">{selectedServer.command}</div>
                                                    <div className="text-slate-500">Arguments</div>
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
                                    
                                    {selectedServer.type === 'stdio' && selectedServer.env && Object.keys(selectedServer.env).length > 0 && (
                                        <div className="bg-[#1a2632] border border-[#233648] rounded-lg p-4">
                                            <h3 className="text-slate-400 text-xs uppercase font-bold mb-3">Environment Variables</h3>
                                            <div className="space-y-2">
                                                {Object.entries(selectedServer.env).map(([k, v]) => (
                                                    <div key={k} className="flex text-sm font-mono border-b border-[#233648] last:border-0 pb-2 last:pb-0">
                                                        <span className="text-purple-400 w-1/3 truncate" title={k}>{k}</span>
                                                        <span className="text-slate-300 w-2/3 truncate" title={v}>{v}</span>
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
                  <span>Latency: {selectedServer.latency}ms</span>
                  <span className={`w-2 h-2 rounded-full ${selectedServer.latency < 50 ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </div>
             </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default McpManagement;
