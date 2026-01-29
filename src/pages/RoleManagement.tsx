import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Tag, 
  Space, 
  Typography, 
  Tooltip,
  Modal,
  Form,
  message,
  Card,
  Tree,
  Popconfirm,
  Drawer
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  BarChartOutlined,
  CodeSandboxOutlined
} from '@ant-design/icons';
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getMenuOptions,
  type RoleData,
  type MenuOption
} from '../services/api';

const { Title, Text } = Typography;

const RoleManagement: React.FC = () => {
  const [data, setData] = useState<RoleData[]>([]);
  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPermissionVisible, setIsPermissionVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [permissionRole, setPermissionRole] = useState<RoleData | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getRoleList(searchText);
      if (res.code === 200) {
        setData(res.data || []);
      } else {
        message.error(res.msg || '获取角色列表失败');
      }
    } catch (error) {
      message.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      const res = await getMenuOptions();
      if (res.code === 200) {
        setMenus(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch menu options:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMenus();
  }, []);

  const handleSearch = () => {
    fetchData();
  };

  const handleReset = () => {
    setSearchText('');
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteRole(id);
      if (res.code === 200) {
        message.success('删除成功');
        fetchData();
      } else {
        message.error(res.msg || '删除失败');
      }
    } catch (error) {
      message.error('删除请求失败');
    }
  };

  const handleEdit = (role: RoleData) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setIsModalVisible(true);
  };

  const handlePermission = (role: RoleData) => {
    setPermissionRole(role);
    setCheckedKeys(role.menus?.map(m => m.id) || []);
    setIsPermissionVisible(true);
  };

  const handlePermissionOk = async () => {
    if (!permissionRole) return;
    setLoading(true);
    try {
        const res = await updateRole({
            id: permissionRole.id,
            menu_ids: checkedKeys
        });
        if (res.code === 200) {
            message.success('权限分配成功');
            setIsPermissionVisible(false);
            fetchData();
        } else {
            message.error(res.msg || '分配失败');
        }
    } catch (error) {
        message.error('请求失败');
    } finally {
        setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      let res;
      if (editingRole) {
        res = await updateRole({
          id: editingRole.id,
          ...values
        });
      } else {
        res = await createRole(values);
      }

      if (res.code === 200) {
        message.success(editingRole ? '更新成功' : '创建成功');
        setIsModalVisible(false);
        fetchData();
      } else {
        message.error(res.msg || '操作失败');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '角色名称 (ROLE NAME)',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => {
        const getIcon = (name: string) => {
          if (name.includes('管理员')) return <SafetyCertificateOutlined className="text-purple-400" />;
          if (name.includes('开发')) return <CodeSandboxOutlined className="text-green-400" />;
          if (name.includes('审计')) return <AuditOutlined className="text-orange-400" />;
          if (name.includes('数据')) return <BarChartOutlined className="text-cyan-400" />;
          return <TeamOutlined className="text-slate-400" />;
        };

        return (
          <Space>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a2632] border border-[#233648]">
                {getIcon(text)}
            </div>
            <span className="font-medium text-slate-200">{text}</span>
            {data.find(r => r.name === text)?.is_system === 1 && (
              <Tag color="purple" className="mr-0 text-[10px] px-1 leading-4 h-4 border-none bg-purple-500/20 text-purple-400">系统</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <span className="text-slate-400">{text || '-'}</span>,
    },
    {
      title: '角色类型',
      dataIndex: 'is_system',
      key: 'is_system',
      width: 120,
      render: (isSystem: number) => (
        <Tag color={isSystem === 1 ? 'purple' : 'blue'} className="border-none">
          {isSystem === 1 ? '系统角色' : '普通角色'}
        </Tag>
      ),
    },
    {
      title: '权限概览 (PERMISSIONS)',
      dataIndex: 'menus',
      key: 'menus',
      render: (menus: any[]) => (
        <Space wrap>
          {menus?.slice(0, 5).map((menu) => (
            <Tag key={menu.id} className="bg-blue-500/10 border-blue-500/20 text-blue-400 text-[10px] px-2 py-0">
              {menu.name}
            </Tag>
          ))}
          {menus?.length > 5 && <span className="text-slate-500 text-xs">+{menus.length - 5}...</span>}
          {(!menus || menus.length === 0) && <span className="text-slate-600">-</span>}
        </Space>
      ),
    },
    {
      title: '操作 (ACTIONS)',
      key: 'actions',
      width: 160,
      render: (_: any, record: RoleData) => (
        <Space>
          <Tooltip title="分配权限">
            <Button 
              type="text" 
              icon={<KeyOutlined />} 
              className="text-amber-400 hover:text-amber-300"
              onClick={() => handlePermission(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              className="text-slate-400 hover:text-white"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => handleDelete(record.id)}
            disabled={record.is_system === 1}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title={record.is_system === 1 ? "系统角色不可删除" : "删除"}>
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                danger
                disabled={record.is_system === 1}
                className={record.is_system === 1 ? "opacity-20" : ""}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <Title level={2} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
                角色管理 <Tag className="bg-[#1a2632] border-[#233648] text-blue-400 ml-2 rounded-full px-3">Total: {data.length} Roles</Tag>
           </Title>
        </div>
        <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-500 border-none h-9 px-4"
        >
            新建角色
        </Button>
      </div>

      <Card 
        className="bg-[#111a22] border-[#233648]" 
        styles={{ body: { padding: '20px' } }}
        bordered={false}
      >
        <div className="flex justify-between mb-6 gap-4">
            <Input 
                prefix={<SearchOutlined className="text-slate-500" />} 
                placeholder="搜索角色名称、描述..." 
                className="bg-[#1a2632] border-[#233648] text-slate-200 placeholder-slate-500 hover:border-blue-500/50 focus:border-blue-500 w-full max-w-[400px]"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
            />
            <div className="flex gap-3">
                 <Button onClick={handleSearch} type="primary" className="bg-blue-600">查询</Button>
                 <Button icon={<ReloadOutlined />} onClick={handleReset} className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500">
                    重置
                 </Button>
            </div>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showTotal: (total, range) => <span className="text-slate-500">显示{range[0]}到{range[1]}个，共 {total} 个角色</span>,
            className: "text-slate-400"
          }}
          className="custom-table"
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-blue-500/10 text-blue-500"><SafetyCertificateOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">权限继承说明</h4>
                <p className="text-slate-400 text-xs leading-relaxed">系统采用 RBAC (基于角色的访问控制) 模型。高级别角色通常继承低级别角色的基础权限。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-green-500/10 text-green-500"><SafetyCertificateOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">安全审计</h4>
                <p className="text-slate-400 text-xs leading-relaxed">所有角色权限变更都将被记录。变更核心权限（如删除知识库）需要管理员确认。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-amber-500/10 text-amber-500"><TeamOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">快速分配</h4>
                <p className="text-slate-400 text-xs leading-relaxed">您可以在"用户管理"界面通过批量操作快速将角色分配给特定的组织或用户组。</p>
            </div>
        </div>
      </div>

      <Modal
        title={editingRole ? "编辑角色" : "新建角色"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="确认"
        cancelText="取消"
        confirmLoading={loading}
        className="dark-modal"
        width={500}
      >
        <Form
            form={form}
            layout="vertical"
        >
            <Form.Item
                name="name"
                label="角色名称"
                rules={[{ required: true, message: '请输入角色名称' }]}
            >
                <Input placeholder="例如：高级分析师" />
            </Form.Item>
            <Form.Item
                name="description"
                label="描述"
            >
                <Input.TextArea placeholder="请输入角色职责描述..." rows={3} />
            </Form.Item>
        </Form>
      </Modal>

      {/* 权限分配抽屉 */}
      <Drawer
        title={
            <div className="flex items-center gap-2">
                <KeyOutlined className="text-amber-400" />
                <span>分配权限 - <Text strong style={{ color: 'white' }}>{permissionRole?.name}</Text></span>
            </div>
        }
        placement="right"
        width={500}
        onClose={() => setIsPermissionVisible(false)}
        open={isPermissionVisible}
        extra={
            <Space>
                <Button onClick={() => setIsPermissionVisible(false)}>取消</Button>
                <Button type="primary" onClick={handlePermissionOk} loading={loading} icon={<CheckCircleOutlined />}>
                    保存更改
                </Button>
            </Space>
        }
        className="dark-drawer"
        styles={{
            header: { borderBottom: '1px solid #233648', background: '#111a22' },
            body: { background: '#111a22', padding: '24px' },
            footer: { borderTop: '1px solid #233648', background: '#111a22' }
        }}
      >
        <div className="bg-[#1a2632] p-4 rounded-lg border border-[#233648] mb-6">
            <Title level={5} style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>菜单与功能权限清单</Title>
            <Tree
                checkable
                onCheck={(keys) => setCheckedKeys(keys as string[])}
                checkedKeys={checkedKeys}
                treeData={menus}
                fieldNames={{ title: 'name', key: 'id', children: 'children' }}
                defaultExpandAll
                className="custom-tree"
                style={{ background: 'transparent', color: '#cbd5e1' }}
            />
        </div>
        <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10">
            <p className="text-xs text-slate-500 leading-relaxed mb-0">
                <CheckCircleOutlined className="mr-1 text-blue-500" />
                勾选上方清单中的项即可为该角色授予相应的页面访问或功能操作权限。
                对于"目录"类型的项，勾选后将自动包含其下的所有子菜单。
            </p>
        </div>
      </Drawer>
    </div>
  );
};

export default RoleManagement;
