import React, { useState, useEffect } from 'react';
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
import { 
  getMenuList, 
  createMenu, 
  updateMenu, 
  deleteMenu
} from '../services/api';
import type { MenuData } from '../services/api';

const { Title } = Typography;
const { Option } = Select;

const MenuManagement: React.FC = () => {
  const [data, setData] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuData | null>(null);
  const [parentItem, setParentItem] = useState<MenuData | null>(null);
  const [form] = Form.useForm();

  // Load data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMenuList(searchText);
      if (res.code === 200) {
        // Recursive function to ensure children is undefined if empty
        const cleanData = (items: MenuData[]): MenuData[] => {
          return items.map(item => {
            const newItem = { ...item };
            if (newItem.children && newItem.children.length === 0) {
              delete newItem.children;
            } else if (newItem.children && newItem.children.length > 0) {
              newItem.children = cleanData(newItem.children);
            }
            return newItem;
          });
        };
        setData(cleanData(res.data || []));
      } else {
        message.error(res.msg || '获取菜单列表失败');
      }
    } catch (error) {
      message.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = () => {
    fetchData();
  };

  const handleReset = () => {
    setSearchText('');
    getMenuList('').then(res => {
      if (res.code === 200) {
        setData(res.data || []);
      }
    });
  };

  // Helper to flatten keys for expanding all
  const getAllKeys = (items: MenuData[]): string[] => {
    let keys: string[] = [];
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        keys.push(item.id);
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
      onOk: async () => {
        try {
          const res = await deleteMenu(id);
          if (res.code === 200) {
            message.success('删除成功');
            fetchData();
          } else {
            message.error(res.msg || '删除失败');
          }
        } catch (error) {
          message.error('请求失败');
        }
      }
    });
  };

  const handleAdd = (parent?: MenuData) => {
    setEditingItem(null);
    setParentItem(parent || null);
    form.resetFields();
    if (parent) {
        form.setFieldsValue({ type: 'menu', parent_id: parent.id }); // Default sub-item to menu
    } else {
        form.setFieldsValue({ type: 'directory', parent_id: '' }); // Default root to directory
    }
    setIsModalVisible(true);
  };

  const handleEdit = (record: MenuData) => {
    setEditingItem(record);
    setParentItem(null); 
    form.setFieldsValue({
        ...record,
        parent_id: record.parent_id || ''
    });
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
        try {
            let res;
            if (editingItem) {
                res = await updateMenu({ ...values, id: editingItem.id });
            } else {
                res = await createMenu(values);
            }

            if (res.code === 200) {
                message.success(editingItem ? '更新成功' : '创建成功');
                setIsModalVisible(false);
                fetchData();
            } else {
                message.error(res.msg || '操作失败');
            }
        } catch (error) {
            message.error('请求失败');
        }
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
            if (!record.api_method && !record.api_path) return '-';
            
            let color = 'default';
            if (record.api_method === 'GET') color = 'blue';
            else if (record.api_method === 'POST') color = 'green';
            else if (record.api_method === 'PUT') color = 'orange';
            else if (record.api_method === 'DELETE') color = 'red';

            return (
                <Space size={4}>
                    {record.api_method && <Tag color={color} className="mr-0 text-[10px] px-1 leading-4 h-5">{record.api_method}</Tag>}
                    <span className="text-slate-400 font-mono text-xs">{record.api_path}</span>
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
                onPressEnter={handleSearch}
            />
            <Space>
              <Button 
                icon={<SearchOutlined />} 
                onClick={handleSearch}
                className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500"
              >
                搜索
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
                className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500"
              >
                  重置
              </Button>
            </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          loading={loading}
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
            initialValues={{ type: 'menu', api_method: 'GET', parent_id: '' }}
        >
            <Form.Item name="parent_id" hidden>
                <Input />
            </Form.Item>
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
                    name="api_method"
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
                    name="api_path"
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
