import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Tag, 
  Space, 
  Typography, 
  Card,
  Modal,
  Form,
  Select,
  message,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  NodeExpandOutlined,
  NodeCollapseOutlined,
  ExportOutlined,
  KeyOutlined,
  ApiOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { Option } = Select;

// Define types
type MenuType = 'directory' | 'menu' | 'button';

interface MenuData {
  id: string;
  name: string;
  type: MenuType;
  path?: string; // Component path
  permission?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiPath?: string;
  children?: MenuData[];
}

// Mock Data
const initialData: MenuData[] = [
  {
    id: '1',
    name: '系统管理',
    type: 'directory',
    path: 'Layout',
    children: [
      {
        id: '1-1',
        name: '用户管理',
        type: 'menu',
        path: '/system/user/index',
        permission: 'sys:user:list',
        apiMethod: 'GET',
        apiPath: '/api/v1/users',
        children: [
          {
            id: '1-1-1',
            name: '新增用户',
            type: 'button',
            permission: 'sys:user:add',
            apiMethod: 'POST',
            apiPath: '/api/v1/users',
          },
          {
            id: '1-1-2',
            name: '修改用户',
            type: 'button',
            permission: 'sys:user:edit',
            apiMethod: 'PUT',
            apiPath: '/api/v1/users',
          },
          {
             id: '1-1-3',
             name: '删除用户',
             type: 'button',
             permission: 'sys:user:delete',
             apiMethod: 'DELETE',
             apiPath: '/api/v1/users',
           }
        ]
      },
      {
        id: '1-2',
        name: '角色管理',
        type: 'menu',
        path: '/system/role/index',
        permission: 'sys:role:list',
        apiMethod: 'GET',
        apiPath: '/api/v1/roles',
        children: [
             {
                id: '1-2-1',
                name: '新增角色',
                type: 'button',
                permission: 'sys:role:add',
                apiMethod: 'POST',
                apiPath: '/api/v1/roles',
              },
        ]
      },
      {
        id: '1-3',
        name: '菜单管理',
        type: 'menu',
        path: '/system/menu/index',
        permission: 'sys:menu:list',
        apiMethod: 'GET',
        apiPath: '/api/v1/menus',
      }
    ]
  },
  {
    id: '2',
    name: '模型管理',
    type: 'directory',
    path: 'Layout',
    children: [
        {
            id: '2-1',
            name: '模型渠道',
            type: 'menu',
            path: '/model/providers',
            permission: 'model:provider:list',
            apiMethod: 'GET',
            apiPath: '/api/v1/providers',
        }
    ]
  }
];

const MenuManagement: React.FC = () => {
  const [data, setData] = useState<MenuData[]>(initialData);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>(['1', '1-1']);
  const [searchText, setSearchText] = useState('');
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuData | null>(null);
  const [parentItem, setParentItem] = useState<MenuData | null>(null);
  const [form] = Form.useForm();

  // Helper to flatten keys for expanding all
  const getAllKeys = (items: MenuData[]): string[] => {
    let keys: string[] = [];
    items.forEach(item => {
      keys.push(item.id);
      if (item.children) {
        keys = keys.concat(getAllKeys(item.children));
      }
    });
    return keys;
  };

  const handleExpandAll = () => {
    setExpandedRowKeys(getAllKeys(data));
  };

  const handleCollapseAll = () => {
    setExpandedRowKeys([]);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该菜单项吗？删除父级将同时删除所有子项。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        const deleteLoop = (items: MenuData[]): MenuData[] => {
            return items.filter(item => {
                if (item.id === id) return false;
                if (item.children) {
                    item.children = deleteLoop(item.children);
                }
                return true;
            });
        };
        setData(deleteLoop([...data]));
        message.success('删除成功');
      }
    });
  };

  const handleAdd = (parent?: MenuData) => {
    setEditingItem(null);
    setParentItem(parent || null);
    form.resetFields();
    if (parent) {
        form.setFieldsValue({ type: 'menu' }); // Default sub-item to menu
    } else {
        form.setFieldsValue({ type: 'directory' }); // Default root to directory
    }
    setIsModalVisible(true);
  };

  const handleEdit = (record: MenuData) => {
    setEditingItem(record);
    setParentItem(null); // Editing existing item, parent context implies staying in place
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
        const newItem: MenuData = {
            id: editingItem ? editingItem.id : Date.now().toString(),
            ...values,
            children: editingItem ? editingItem.children : []
        };

        if (editingItem) {
            // Update existing
            const updateLoop = (items: MenuData[]): MenuData[] => {
                return items.map(item => {
                    if (item.id === editingItem.id) {
                        return { ...newItem, children: item.children }; // Preserve children
                    }
                    if (item.children) {
                        return { ...item, children: updateLoop(item.children) };
                    }
                    return item;
                });
            };
            setData(updateLoop([...data]));
            message.success('更新成功');
        } else {
            // Add new
            if (parentItem) {
                const addLoop = (items: MenuData[]): MenuData[] => {
                    return items.map(item => {
                        if (item.id === parentItem.id) {
                            return { 
                                ...item, 
                                children: [...(item.children || []), newItem] 
                            };
                        }
                        if (item.children) {
                            return { ...item, children: addLoop(item.children) };
                        }
                        return item;
                    });
                };
                setData(addLoop([...data]));
                // Auto expand parent
                setExpandedRowKeys(prev => [...prev, parentItem.id]);
            } else {
                setData([...data, newItem]);
            }
            message.success('创建成功');
        }
        setIsModalVisible(false);
    });
  };

  const columns: ColumnsType<MenuData> = [
    {
      title: '菜单名称 (MENU NAME)',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text, record) => {
        let icon;
        if (record.type === 'directory') icon = <FolderOpenOutlined className="text-blue-400" />;
        else if (record.type === 'menu') icon = <FileTextOutlined className="text-green-400" />;
        else icon = <ThunderboltOutlined className="text-amber-400" />;
        
        return (
          <Space>
            {icon}
            <span className="text-slate-200">{text}</span>
          </Space>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: MenuType) => {
        if (type === 'directory') return <Tag color="blue" className="bg-blue-500/10 border-blue-500/20 text-blue-400">目录</Tag>;
        if (type === 'menu') return <Tag color="green" className="bg-green-500/10 border-green-500/20 text-green-400">菜单</Tag>;
        return <Tag color="gold" className="bg-amber-500/10 border-amber-500/20 text-amber-400">按钮</Tag>;
      },
    },
    {
      title: '组件路径',
      dataIndex: 'path',
      key: 'path',
      render: (text) => <span className="text-slate-400 font-mono text-xs">{text || '-'}</span>,
    },
    {
        title: '权限标识',
        dataIndex: 'permission',
        key: 'permission',
        render: (text) => text ? <code className="bg-[#111a22] border border-[#233648] px-1 py-0.5 rounded text-slate-300 text-xs">{text}</code> : '-',
    },
    {
        title: '后端接口 (API)',
        key: 'api',
        width: 200,
        render: (_, record) => {
            if (!record.apiMethod && !record.apiPath) return '-';
            
            let color = 'default';
            if (record.apiMethod === 'GET') color = 'blue';
            else if (record.apiMethod === 'POST') color = 'green';
            else if (record.apiMethod === 'PUT') color = 'orange';
            else if (record.apiMethod === 'DELETE') color = 'red';

            return (
                <Space size={4}>
                    {record.apiMethod && <Tag color={color} className="mr-0 text-[10px] px-1 leading-4 h-5">{record.apiMethod}</Tag>}
                    <span className="text-slate-400 font-mono text-xs">{record.apiPath}</span>
                </Space>
            );
        }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} className="text-slate-400 hover:text-white" onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="添加子项">
            <Button type="text" icon={<PlusOutlined />} className="text-slate-400 hover:text-blue-400" onClick={() => handleAdd(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <Title level={2} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
                菜单与按钮权限管理 <Tag className="bg-[#1a2632] border-[#233648] text-blue-400 ml-2 rounded px-2">Hierarchical Control</Tag>
           </Title>
        </div>
        <Space>
             <Button 
                icon={expandedRowKeys.length > 0 ? <NodeCollapseOutlined /> : <NodeExpandOutlined />} 
                onClick={expandedRowKeys.length > 0 ? handleCollapseAll : handleExpandAll}
                className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500"
            >
                {expandedRowKeys.length > 0 ? '全部收起' : '全部展开'}
            </Button>
            <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => handleAdd()}
                className="bg-blue-600 hover:bg-blue-500 border-none h-9 px-4"
            >
                新增根菜单
            </Button>
        </Space>
      </div>

      <Card 
        className="bg-[#111a22] border-[#233648]" 
        bodyStyle={{ padding: '20px' }}
        bordered={false}
      >
        <div className="flex justify-between mb-6 gap-4">
            <Input 
                prefix={<SearchOutlined className="text-slate-500" />} 
                placeholder="搜索菜单名称、权限标识或接口路径..." 
                className="bg-[#1a2632] border-[#233648] text-slate-200 placeholder-slate-500 hover:border-blue-500/50 focus:border-blue-500 w-full max-w-[400px]"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500">
                重置
            </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
          }}
          className="custom-table"
        />

        <div className="flex justify-between items-center mt-4 border-t border-[#233648] pt-4">
             <span className="text-slate-500 text-sm">共计 {getAllKeys(data).length} 个菜单/权限项</span>
             <Space>
                 <Button size="small" className="bg-[#1a2632] border-[#233648] text-slate-400" onClick={handleExpandAll}>展开全部</Button>
                 <Button size="small" icon={<ExportOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-400">导出 JSON</Button>
             </Space>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-blue-500/10 text-blue-500"><KeyOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">权限标识说明</h4>
                <p className="text-slate-400 text-xs leading-relaxed">权限标识用于前端 v-permission 指令控制按钮显示。通常遵循 模块:功能:操作 命名规范，例如 sys:user:add。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-green-500/10 text-green-500"><ApiOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">后端接口关联</h4>
                <p className="text-slate-400 text-xs leading-relaxed">将菜单/按钮与具体的 RESTful API 路径绑定，实现服务端的动态 URL 权限校验。支持通配符路径匹配。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-amber-500/10 text-amber-500"><PartitionOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">层级继承</h4>
                <p className="text-slate-400 text-xs leading-relaxed">删除父级节点将同时禁用或删除所有子项。系统会自动根据层级结构渲染侧边栏导航和面包屑路径。</p>
            </div>
        </div>
      </div>

      <Modal
        title={editingItem ? "编辑菜单/权限" : (parentItem ? `新增子项 (父级: ${parentItem.name})` : "新增根菜单")}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="确认"
        cancelText="取消"
        className="dark-modal"
        width={600}
      >
        <Form
            form={form}
            layout="vertical"
            initialValues={{ type: 'menu', apiMethod: 'GET' }}
        >
            <div className="grid grid-cols-2 gap-4">
                <Form.Item
                    name="type"
                    label="类型"
                    rules={[{ required: true }]}
                >
                    <Select>
                        <Option value="directory">目录</Option>
                        <Option value="menu">菜单</Option>
                        <Option value="button">按钮</Option>
                    </Select>
                </Form.Item>
                <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                >
                    <Input placeholder="例如：用户管理" />
                </Form.Item>
            </div>

            <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.type !== current.type}
            >
                {({ getFieldValue }) => {
                    const type = getFieldValue('type');
                    return type !== 'button' ? (
                        <Form.Item
                            name="path"
                            label="组件路径 / 路由地址"
                            extra="目录通常填 Layout，菜单填组件路径如 /system/user/index"
                        >
                            <Input placeholder="Layout 或 /views/path/to/component" />
                        </Form.Item>
                    ) : null;
                }}
            </Form.Item>

            <Form.Item
                name="permission"
                label="权限标识"
                extra="用于前端控制显隐，如 sys:user:list"
            >
                 <Input placeholder="module:feature:action" prefix={<KeyOutlined className="text-slate-500" />} />
            </Form.Item>

            <div className="grid grid-cols-4 gap-4">
                <Form.Item
                    name="apiMethod"
                    label="请求方式"
                    className="col-span-1"
                >
                     <Select>
                        <Option value="GET">GET</Option>
                        <Option value="POST">POST</Option>
                        <Option value="PUT">PUT</Option>
                        <Option value="DELETE">DELETE</Option>
                    </Select>
                </Form.Item>
                <Form.Item
                    name="apiPath"
                    label="后端接口路径"
                    className="col-span-3"
                >
                    <Input placeholder="/api/v1/resource" />
                </Form.Item>
            </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuManagement;
