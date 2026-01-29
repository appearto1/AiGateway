import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Typography, 
  Table, 
  Tag, 
  Space, 
  Avatar, 
  Modal, 
  Form, 
  Select, 
  Switch, 
  message, 
  Dropdown, 
  Tree,
  Card,
  Pagination,
  Tooltip,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  MoreOutlined, 
  ExportOutlined,
  UserAddOutlined,
  FilterOutlined,
  MailOutlined,
  PhoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CaretDownOutlined,
  RightOutlined,
  CodeOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { 
  getUserList, 
  createUser, 
  updateUser, 
  deleteUser, 
  batchDeleteUsers,
  getOrgTree,
  getRoleList,
} from '../services/api';
import type { 
  UserData,
  OrgData,
  RoleData
} from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

// Main Component
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deptTreeData, setDeptTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [flatDepts, setFlatDepts] = useState<OrgData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [form] = Form.useForm();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);

  const getAllTreeKeys = (nodes: DataNode[]): React.Key[] => {
    let keys: React.Key[] = [];
    nodes.forEach((node) => {
      keys.push(node.key);
      if (node.children?.length) {
        keys = keys.concat(getAllTreeKeys(node.children));
      }
    });
    return keys;
  };

  useEffect(() => {
    fetchDepts();
    fetchRoles();
    fetchUsers();
  }, [selectedDeptId, selectedRole, page, pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUserList({ 
        keyword: searchText || undefined, 
        role_id: selectedRole, 
        department_id: selectedDeptId === 'all' ? undefined : selectedDeptId,
        page,
        pageSize
      });
      if (res.code === 200) {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
      } else {
        message.error(res.msg || '获取用户列表失败');
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await getOrgTree();
      if (res.code === 200) {
        const data = res.data || [];
        
        // Flatten function for select options
        const flatten = (items: OrgData[]): OrgData[] => {
          let result: OrgData[] = [];
          items.forEach(item => {
            result.push(item);
            if (item.children) {
              result = result.concat(flatten(item.children));
            }
          });
          return result;
        };
        setFlatDepts(flatten(data));

        const mapToTree = (data: OrgData[]): DataNode[] => {
          return data.map(item => ({
            title: item.name,
            key: item.id,
            icon: <ApartmentOutlined />,
            children: item.children ? mapToTree(item.children) : []
          }));
        };
        const treeData = [
          {
            title: '所有部门',
            key: 'all',
            icon: <TeamOutlined />,
            children: mapToTree(data)
          }
        ];
        setDeptTreeData(treeData);
        setExpandedKeys((prev) => (prev.length === 0 ? getAllTreeKeys(treeData) : prev));
      }
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await getRoleList();
      if (res.code === 200) {
        setRoles(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles');
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setIsModalVisible(true);
  };

  const handleEdit = (record: UserData) => {
    setEditingUser(record);
    form.setFieldsValue({
      ...record,
      status: record.status === 1
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await deleteUser(id);
          if (res.code === 200) {
            message.success('删除成功');
            fetchUsers();
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await batchDeleteUsers(selectedRowKeys as string[]);
          if (res.code === 200) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchUsers();
          }
        } catch (error) {
          message.error('操作失败');
        }
      }
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      try {
        const data = {
          ...values,
          status: values.status ? 1 : 0
        };
        let res;
        if (editingUser) {
          res = await updateUser({ ...data, id: editingUser.id });
        } else {
          res = await createUser(data);
        }
        
        if (res.code === 200) {
          message.success(editingUser ? '更新成功' : '创建成功');
          setIsModalVisible(false);
          fetchUsers();
        }
      } catch (error) {
        message.error('操作失败');
      }
    });
  };

  const columns: ColumnsType<UserData> = [
    {
      title: '用户信息 (USER)',
      dataIndex: 'username',
      key: 'user',
      render: (text, record) => {
        const initial =
          (record.nickname && record.nickname.trim().charAt(0)) ||
          (record.username && record.username.trim().charAt(0)) ||
          'U';

        return (
          <Space size="middle">
            <Avatar 
              size={40} 
              className="flex items-center justify-center font-bold"
              style={{ backgroundColor: record.status === 1 ? '#3b82f6' : '#475569' }}
            >
              {record.avatar || initial}
            </Avatar>
            <div>
              {/* 显示昵称 */}
              <div className="text-white font-medium text-sm">
                {record.nickname || record.username}
              </div>
              {/* 显示用户名 */}
              <div className="text-slate-400 text-xs font-mono">
                {record.username}
              </div>
              {/* 创建时间 */}
              <div className="text-slate-500 text-xs">
                Created {record.created_at}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: '手机号 (PHONE)',
      dataIndex: 'phone',
      key: 'phone',
      className: 'text-slate-300 font-mono text-sm',
    },
    {
      title: '邮箱 (EMAIL)',
      dataIndex: 'email',
      key: 'email',
      className: 'text-slate-400 font-mono text-sm',
    },
    {
      title: '部门 (DEPARTMENT)',
      dataIndex: 'department_name',
      key: 'dept',
      render: (text) => (
        <span className="text-slate-300">{text}</span>
      ),
    },
    {
      title: '角色 (ROLE)',
      dataIndex: 'role_names',
      key: 'roles',
      render: (roleNames: string[]) => (
        <Space size={[0, 4]} wrap>
          {roleNames?.map(role => {
            let icon = <TeamOutlined />;
            let colorClass = 'text-blue-400';
            if (role === '管理员') {
              icon = <SafetyCertificateOutlined />;
              colorClass = 'text-amber-500';
            } else if (role === '开发者') {
              icon = <CodeOutlined />;
              colorClass = 'text-blue-500';
            } else if (role === '查看者') {
              icon = <EyeOutlined />;
              colorClass = 'text-slate-400';
            }
            return (
              <Tag key={role} className="bg-[#1a2632] border-[#233648] text-slate-300 rounded-md px-2 py-0.5 text-xs flex items-center gap-1.5">
                <span className={colorClass}>{icon}</span>
                {role}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '状态 (STATUS)',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) =>
        status === 1 ? (
          <Tag color="success" className="bg-green-500/10 border-green-500/30 text-green-400">启用</Tag>
        ) : (
          <Tag color="default" className="bg-slate-500/10 border-slate-500/30 text-slate-400">停用</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Dropdown 
          menu={{ 
            items: [
              { key: 'edit', label: '编辑', icon: <EditOutlined />, onClick: () => handleEdit(record) },
              { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record.id) },
            ] 
          }} 
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined className="text-slate-500 rotate-90" />} />
        </Dropdown>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="flex h-full bg-[#0d1117]">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-[#233648] flex flex-col bg-[#0d1117]">
        <div className="p-4 border-b border-[#233648] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ApartmentOutlined className="text-blue-500" />
            <span className="text-white font-bold">组织架构</span>
          </div>
          <Button type="text" size="small" icon={<PlusOutlined className="text-slate-400" />} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-tree-sidebar">
          <Tree
            showIcon
            treeData={deptTreeData}
            expandedKeys={expandedKeys.length > 0 ? expandedKeys : undefined}
            onExpand={(keys) => setExpandedKeys(keys)}
            defaultExpandAll
            onSelect={(keys) => setSelectedDeptId(keys[0] as string)}
            className="bg-transparent text-slate-400"
            selectedKeys={selectedDeptId ? [selectedDeptId] : []}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 使用系统框架 TopHeader，此处仅保留页面标题与操作 */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Title level={4} style={{ color: 'white', margin: 0 }}>用户管理</Title>
              <Tag className="bg-[#1e293b] border-[#334155] text-blue-400 rounded-full px-3">
                Total: {total}
              </Tag>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-500 border-none px-4 rounded-lg"
              onClick={handleAdd}
            >
              新增用户
            </Button>
          </div>
          {/* Filters Bar */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-4">
              <Input 
                placeholder="搜索用户名或手机号..." 
                prefix={<SearchOutlined className="text-slate-500" />}
                className="w-72 bg-[#1a2632] border-[#233648] text-slate-200"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={fetchUsers}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                className="bg-blue-600 hover:bg-blue-500 border-none"
                onClick={fetchUsers}
              >
                查询
              </Button>
              <Select 
                placeholder="所有角色" 
                className="w-40 dark-select"
                allowClear
                onChange={value => setSelectedRole(value)}
              >
                {roles.map(role => (
                  <Option key={role.id} value={role.id}>
                    {role.name}{role.is_system === 1 ? ' (系统)' : ''}
                  </Option>
                ))}
              </Select>
            </div>
            <div className="flex gap-3">
              {selectedRowKeys.length > 0 && (
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  className="border-red-500/50 hover:bg-red-500/10"
                  onClick={handleBatchDelete}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              )}
              <Button 
                icon={<ExportOutlined />} 
                className="bg-[#1a2632] border-[#233648] text-slate-400 hover:text-white"
              >
                导出
              </Button>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 bg-[#111a22] border border-[#233648] rounded-xl overflow-hidden flex flex-col">
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={users}
              rowKey="id"
              pagination={false}
              loading={loading}
              className="dark-table flex-1"
              scroll={{ y: 'calc(100vh - 380px)' }}
            />
            {/* Pagination Footer */}
            <div className="p-4 border-t border-[#233648] flex justify-between items-center bg-[#111a22]">
              <span className="text-slate-500 text-sm">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
              </span>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                showSizeChanger
                size="small"
                className="dark-pagination"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        title={
          <div className="flex items-center gap-4 py-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <UserAddOutlined className="text-blue-500 text-xl" />
            </div>
            <div>
              <div className="text-white text-lg font-bold tracking-tight">新增 / 编辑用户详情</div>
              <div className="text-slate-500 text-xs font-normal mt-0.5">配置用户基本信息、组织架构归属及平台角色权限</div>
            </div>
          </div>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)} className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500 h-10 px-6 rounded-lg">
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleModalOk} className="bg-blue-600 hover:bg-blue-500 border-none h-10 px-8 rounded-lg ml-3">
            保存
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-6"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-white font-bold text-base tracking-wide">基本信息</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Form.Item
                name="username"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">用户名 <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="例如：John Doe" className="h-10" disabled={!!editingUser} />
              </Form.Item>
              <Form.Item
                name="password"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{editingUser ? '重置密码' : '登录密码'} {!editingUser && <span className="text-red-500">*</span>}</span>}
                rules={[{ required: !editingUser, message: '请输入密码' }]}
              >
                <Input.Password placeholder={editingUser ? "留空则不修改" : "请输入登录密码"} className="h-10" />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
              <Form.Item
                name="nickname"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">姓名/昵称 <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: '请输入姓名/昵称' }]}
              >
                <Input placeholder="请输入姓名" className="h-10" />
              </Form.Item>
              <Form.Item
                name="phone"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">手机号</span>}
              >
                <Input placeholder="138-0000-1111" maxLength={11} className="h-10" />
              </Form.Item>
            </div>
            <Form.Item
              name="email"
              label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">邮箱 <span className="text-red-500">*</span></span>}
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="john.doe@infra.ai" className="h-10" />
            </Form.Item>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-white font-bold text-base tracking-wide">组织与角色</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Form.Item
                name="department_id"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">所属组织 <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: '请选择组织' }]}
              >
                <Select placeholder="请选择所属组织" className="h-10">
                  {flatDepts.map(dept => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="job_title"
                label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">职务</span>}
              >
                <Input placeholder="例如：高级工程师" className="h-10" />
              </Form.Item>
            </div>
            <Form.Item
              name="roles"
              label={<span className="text-slate-400 text-xs font-medium uppercase tracking-wider">角色分配 <span className="text-red-500">*</span></span>}
              rules={[{ required: true, message: '请分配至少一个角色' }]}
            >
              <Select mode="multiple" placeholder="请选择平台角色" className="dark-select-multi">
                {roles.map(role => (
                  <Option key={role.id} value={role.id}>
                    {role.name}{role.is_system === 1 ? ' (系统)' : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="bg-[#1a2632]/50 p-5 rounded-xl flex justify-between items-center border border-[#233648] transition-all hover:border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/5 flex items-center justify-center border border-blue-500/10">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <div>
                <div className="text-white font-bold">账号状态</div>
                <div className="text-slate-500 text-xs mt-0.5">启用后，该用户可以正常登录平台并访问授权资源</div>
              </div>
            </div>
            <Form.Item name="status" valuePropName="checked" noStyle>
              <Switch checkedChildren="启用" unCheckedChildren="禁用" className="bg-slate-700" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <style>{`
        /* Custom Tree Styling */
        .custom-tree-sidebar .ant-tree-treenode {
          width: 100%;
          display: flex !important;
          align-items: center !important;
          padding: 6px 8px !important;
          margin: 2px 0 !important;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        /* Hover and Selected state on the whole row */
        .custom-tree-sidebar .ant-tree-treenode:hover {
          background-color: rgba(255, 255, 255, 0.04);
        }
        .custom-tree-sidebar .ant-tree-treenode-selected {
          background-color: #1a2632 !important;
        }

        .custom-tree-sidebar .ant-tree-switcher {
          width: 20px !important;
          height: 20px !important;
          flex-shrink: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
        }
        
        .custom-tree-sidebar .ant-tree-node-content-wrapper {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 0 8px 0 2px !important;
          background: transparent !important; /* Remove default background */
          display: flex !important;
          align-items: center !important;
          color: inherit !important;
        }

        .custom-tree-sidebar .ant-tree-node-selected .ant-tree-title {
          color: #3b82f6 !important;
        }

        .custom-tree-sidebar .ant-tree-title {
          flex: 1 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-size: 13px;
        }

        .custom-tree-sidebar .ant-tree-indent {
          display: flex !important;
        }

        /* Dark Table Styling */
        .dark-table .ant-table {
          background: transparent !important;
          color: #94a3b8;
        }
        .dark-table .ant-table-thead > tr > th {
          background: #111a22 !important;
          color: #64748b !important;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #233648 !important;
        }
        .dark-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #233648 !important;
          padding: 16px !important;
          transition: all 0.2s;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background: #1a2632 !important;
        }
        .dark-table .ant-checkbox-inner {
          background-color: #0d1117;
          border-color: #334155;
        }
        
        /* Dark Modal Styling */
        .dark-modal .ant-modal-content {
          background-color: #111a22 !important;
          border: 1px solid #233648;
          color: white;
          border-radius: 16px;
        }
        .dark-modal .ant-modal-header {
          background: linear-gradient(to bottom, #162029, #111a22) !important;
          border-bottom: 1px solid #233648;
          padding: 16px 24px;
          border-radius: 16px 16px 0 0;
        }
        .dark-modal .ant-modal-body {
          padding: 24px !important;
        }
        .dark-modal .ant-modal-footer {
          border-top: 1px solid #233648;
          padding: 16px 24px;
        }
        .dark-modal .ant-input, 
        .dark-modal .ant-select-selector,
        .dark-modal .ant-input-number {
          background-color: #1a2632 !important;
          border-color: #233648 !important;
          color: white !important;
          border-radius: 8px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .dark-modal .ant-input:hover, 
        .dark-modal .ant-select-selector:hover {
          border-color: #3b82f6 !important;
          background-color: #1e293b !important;
        }
        .dark-modal .ant-input:focus, 
        .dark-modal .ant-select-focused .ant-select-selector {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          background-color: #1e293b !important;
        }
        .dark-modal .ant-form-item-label > label {
          color: #94a3b8 !important;
        }

        /* Select styling */
        .dark-select .ant-select-selector {
          background-color: #1a2632 !important;
          border-color: #233648 !important;
          color: white !important;
          border-radius: 8px !important;
        }
        .dark-select-multi .ant-select-selection-item {
          background-color: #2d3748 !important;
          border-color: #4a5568 !important;
          color: #e2e8f0 !important;
        }

        /* Pagination styling */
        .dark-pagination .ant-pagination-item a {
          color: #94a3b8 !important;
        }
        .dark-pagination .ant-pagination-item-active {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        .dark-pagination .ant-pagination-item-active a {
          color: white !important;
        }
        .dark-pagination .ant-pagination-prev .ant-pagination-item-link,
        .dark-pagination .ant-pagination-next .ant-pagination-item-link {
          background-color: #1a2632 !important;
          border-color: #233648 !important;
          color: #94a3b8 !important;
        }
        .dark-pagination .ant-pagination-item {
          background-color: #1a2632 !important;
          border-color: #233648 !important;
        }
        .dark-pagination .ant-pagination-options-size-changer .ant-select-selector {
          background-color: #1a2632 !important;
          border-color: #233648 !important;
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
