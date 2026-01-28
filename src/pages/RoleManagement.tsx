import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Space, 
  Typography, 
  Tooltip,
  Modal,
  Form,
  message,
  Card
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined, 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  AuditOutlined,
  BarChartOutlined,
  CodeSandboxOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// Mock data based on the image
interface Role {
  id: string;
  name: string;
  memberCount: number;
  description: string;
  permissions: {
    resource: string;
    actions: string[];
    type: 'blue' | 'purple' | 'orange' | 'cyan' | 'default';
  }[];
  isSystem?: boolean;
}

const initialRoles: Role[] = [
  {
    id: '1',
    name: '系统管理员',
    memberCount: 3,
    description: '拥有系统所有资源的最高访问权限，可进行所有操作。',
    permissions: [
      { resource: '知识库', actions: ['读/写/删'], type: 'blue' },
      { resource: 'MCP', actions: ['执行/管理'], type: 'purple' },
    ],
    isSystem: true
  },
  {
    id: '2',
    name: '模型开发者',
    memberCount: 12,
    description: '负责模型微调、工作流编排及提示词工程。',
    permissions: [
      { resource: '知识库', actions: ['读/写'], type: 'blue' },
      { resource: 'MCP', actions: ['执行'], type: 'purple' },
      { resource: '模型', actions: ['调用'], type: 'orange' },
    ],
    isSystem: false
  },
  {
    id: '3',
    name: '审计员',
    memberCount: 2,
    description: '审查调用日志及费用账单，确保合规性。',
    permissions: [
      { resource: '日志', actions: ['只读'], type: 'default' },
      { resource: '费用', actions: ['只读'], type: 'default' },
    ],
    isSystem: false
  },
  {
    id: '4',
    name: '数据分析师',
    memberCount: 5,
    description: '数据预处理及评估模型输出质量。',
    permissions: [
      { resource: '知识库', actions: ['读/写'], type: 'blue' },
      { resource: '数据集', actions: ['管理'], type: 'orange' }, // Using orange as generic warn/attention color from screenshot
    ],
    isSystem: false
  }
];

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const columns = [
    {
      title: '角色名称 (ROLE NAME)',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Role) => {
        let icon = <SafetyCertificateOutlined />;
        if (text === '系统管理员') icon = <SafetyCertificateOutlined className="text-purple-400" />;
        else if (text === '模型开发者') icon = <CodeSandboxOutlined className="text-green-400" />; // Assuming icon from image
        else if (text === '审计员') icon = <AuditOutlined className="text-orange-400" />;
        else if (text === '数据分析师') icon = <BarChartOutlined className="text-blue-400" />;

        // Helper for icons based on text if not exact match, using generic logic
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
          </Space>
        );
      },
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (count: number) => <span className="text-slate-400">{count}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <span className="text-slate-400">{text}</span>,
    },
    {
      title: '权限概览 (PERMISSIONS OVERVIEW)',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: Role['permissions']) => (
        <Space wrap>
          {permissions.map((perm, index) => {
            let color = 'default';
            let borderColor = 'border-slate-700';
            let bgColor = 'bg-slate-800/50';
            
            // Map colors from our data structure to Tailwind classes/Antd colors
            if (perm.type === 'blue') {
                color = 'blue';
                bgColor = 'bg-blue-500/10';
                borderColor = 'border-blue-500/20';
            } else if (perm.type === 'purple') {
                color = 'purple';
                bgColor = 'bg-purple-500/10';
                borderColor = 'border-purple-500/20';
            } else if (perm.type === 'orange') {
                color = 'orange'; // Antd gold/orange
                bgColor = 'bg-amber-500/10';
                borderColor = 'border-amber-500/20';
            } else if (perm.type === 'cyan') {
                color = 'cyan';
                bgColor = 'bg-cyan-500/10';
                borderColor = 'border-cyan-500/20';
            }

            return (
              <div key={index} className={`flex items-center text-xs px-2 py-1 rounded border ${borderColor} ${bgColor}`}>
                 <span className={`mr-1 ${perm.type === 'blue' ? 'text-blue-400' : perm.type === 'purple' ? 'text-purple-400' : perm.type === 'orange' ? 'text-amber-400' : perm.type === 'cyan' ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {perm.resource}:
                 </span>
                 <span className="text-slate-300">{perm.actions.join('/')}</span>
              </div>
            );
          })}
          {permissions.length > 2 && <Tag className="bg-[#1a2632] border-[#233648] text-slate-400">+{permissions.length - 2} 更多</Tag>}
        </Space>
      ),
    },
    {
      title: '操作 (ACTIONS)',
      key: 'actions',
      width: 120,
      render: (_: any, record: Role) => (
        <Space>
           <Button 
            type="text" 
            icon={<EditOutlined />} 
            className="text-slate-400 hover:text-white"
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            danger
            disabled={record.isSystem} // System admin cannot be deleted usually
            className={record.isSystem ? "opacity-20" : ""}
          />
        </Space>
      ),
    },
  ];

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(p => p.resource) // Simplified for demo
    });
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
        // Here we would construct the new role object properly
        const newRole: Role = {
            id: editingRole ? editingRole.id : Date.now().toString(),
            name: values.name,
            memberCount: editingRole ? editingRole.memberCount : 0,
            description: values.description,
            permissions: [], // Logic to parse permissions would go here
            isSystem: false
        };

        if (editingRole) {
            setRoles(roles.map(r => r.id === editingRole.id ? newRole : r));
            message.success('角色更新成功');
        } else {
            setRoles([...roles, newRole]);
            message.success('角色创建成功');
        }
        setIsModalVisible(false);
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <Title level={2} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
                角色管理 <Tag className="bg-[#1a2632] border-[#233648] text-blue-400 ml-2 rounded-full px-3">Total: {roles.length} Roles</Tag>
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
        bodyStyle={{ padding: '20px' }}
        bordered={false}
      >
        <div className="flex justify-between mb-6 gap-4">
            <Input 
                prefix={<SearchOutlined className="text-slate-500" />} 
                placeholder="全局搜索角色名称、描述或权限关键词..." 
                className="bg-[#1a2632] border-[#233648] text-slate-200 placeholder-slate-500 hover:border-blue-500/50 focus:border-blue-500 w-full max-w-[400px]"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
            <div className="flex gap-3">
                 <Select 
                    defaultValue="all" 
                    className="w-[140px]"
                    dropdownClassName="bg-[#1a2632] border border-[#233648]"
                    options={[
                        { value: 'all', label: '所有权限范围' },
                        { value: 'system', label: '系统级' },
                        { value: 'project', label: '项目级' },
                    ]}
                 />
                 <Button icon={<FilterOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500">
                    高级筛选
                 </Button>
                 <Button icon={<ReloadOutlined />} className="bg-[#1a2632] border-[#233648] text-slate-300 hover:text-white hover:border-slate-500">
                    重置
                 </Button>
            </div>
        </div>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          pagination={{ 
            total: roles.length, 
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
                <p className="text-slate-400 text-xs leading-relaxed">系统采用 RBAC (基于角色的访问控制) 模型。高级别角色通常继承低级别角色的基础权限，同时拥有专属的敏感操作权限。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-green-500/10 text-green-500"><SafetyCertificateOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">安全审计</h4>
                <p className="text-slate-400 text-xs leading-relaxed">所有角色权限变更都将被记录在“调用日志”中。变更核心权限（如删除知识库）需要管理员二次确认。</p>
            </div>
        </div>
        <div className="bg-[#111a22] p-6 rounded-lg border border-[#233648] flex gap-4">
            <div className="p-2 h-fit rounded-full bg-amber-500/10 text-amber-500"><TeamOutlined style={{ fontSize: '20px' }} /></div>
            <div>
                <h4 className="text-white font-bold mb-2">快速分配</h4>
                <p className="text-slate-400 text-xs leading-relaxed">您可以在“用户管理”界面通过批量操作快速将角色分配给特定的部门或用户组。</p>
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
        className="dark-modal"
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
                rules={[{ required: true, message: '请输入角色描述' }]}
            >
                <Input.TextArea placeholder="请输入角色职责描述..." />
            </Form.Item>
             <Form.Item
                name="permissions"
                label="权限配置 (简化版)"
            >
                <Select mode="multiple" placeholder="选择权限">
                    <Option value="知识库">知识库管理</Option>
                    <Option value="模型">模型调用</Option>
                    <Option value="MCP">MCP 工具</Option>
                    <Option value="日志">日志查看</Option>
                </Select>
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;
