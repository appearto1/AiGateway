import React, { useState } from 'react';
import { 
  Button, 
  Input, 
  Typography, 
  Card,
  Tree,
  Avatar,
  Progress,
  Switch,
  Tag,
  Space,
  Tooltip,
  Badge,
  Dropdown,
  Modal,
  Form,
  Select,
  InputNumber,
  TreeSelect,
  message
} from 'antd';
import type { MenuProps } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  DeploymentUnitOutlined, 
  UserOutlined,
  EditOutlined,
  MoreOutlined,
  HolderOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  FolderAddOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Title, Text } = Typography;
const { Option } = Select;

interface OrgNode extends DataNode {
  key: string;
  title: string;
  enTitle?: string;
  manager?: string;
  managerAvatar?: string; // Color or Image URL
  memberCount: number;
  quotaUsed: number;
  quotaTotal: number;
  quotaUnit: 'M' | 'B';
  disabled?: boolean;
  children?: OrgNode[];
}

const initialData: OrgNode[] = [
  {
    key: '1',
    title: '总经办',
    enTitle: 'HEADQUARTERS',
    manager: '王大为',
    managerAvatar: '#4096ff', // Blue
    memberCount: 12,
    quotaUsed: 80.0,
    quotaTotal: 100,
    quotaUnit: 'M',
    children: [
        {
            key: '1-1',
            title: '研发部',
            enTitle: 'R&D DEPARTMENT',
            manager: '李明远',
            managerAvatar: '#52c41a', // Green
            memberCount: 45,
            quotaUsed: 1.2,
            quotaTotal: 2.0,
            quotaUnit: 'B',
            children: [
                {
                    key: '1-1-1',
                    title: 'AI 算法组',
                    manager: '张小龙',
                    memberCount: 18,
                    quotaUsed: 0,
                    quotaTotal: 500,
                    quotaUnit: 'M',
                    isLeaf: true
                },
                {
                    key: '1-1-2',
                    title: '基础设施组',
                    manager: '陈科技',
                    memberCount: 27,
                    quotaUsed: 0,
                    quotaTotal: 1.5,
                    quotaUnit: 'B',
                    isLeaf: true
                }
            ]
        },
        {
            key: '1-2',
            title: '市场部',
            enTitle: 'MARKETING DEPT',
            manager: '赵敏',
            managerAvatar: '#722ed1', // Purple
            memberCount: 22,
            quotaUsed: 50.4,
            quotaTotal: 200,
            quotaUnit: 'M',
        },
        {
            key: '1-3',
            title: '财务部 (已停用)',
            memberCount: 0,
            quotaUsed: 0,
            quotaTotal: 0,
            quotaUnit: 'M',
            disabled: true
        }
    ]
  },
  {
      key: '2',
      title: '上海分公司',
      enTitle: 'SHANGHAI BRANCH',
      manager: '林晓峰',
      managerAvatar: '#fa8c16', // Orange
      memberCount: 38,
      quotaUsed: 1.1,
      quotaTotal: 1.5,
      quotaUnit: 'B',
  }
];

const MOCK_USERS = [
    { name: '王大为', color: '#4096ff' },
    { name: '李明远', color: '#52c41a' },
    { name: '张小龙', color: '#1890ff' },
    { name: '陈科技', color: '#13c2c2' },
    { name: '赵敏', color: '#722ed1' },
    { name: '林晓峰', color: '#fa8c16' },
    { name: '刘强', color: '#f5222d' },
    { name: '周杰', color: '#eb2f96' },
];

const OrgManagement: React.FC = () => {
  const [treeData, setTreeData] = useState<OrgNode[]>(initialData);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['1', '1-1']);
  const [searchValue, setSearchValue] = useState('');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [form] = Form.useForm();

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  // --- CRUD Handlers ---

  const handleAdd = (parentNode?: OrgNode) => {
    setEditingNode(null);
    form.resetFields();
    if (parentNode) {
        form.setFieldsValue({ parentKey: parentNode.key });
    }
    form.setFieldsValue({ 
        quotaTotal: 100, 
        quotaUnit: 'M', 
        status: true 
    });
    setIsModalVisible(true);
  };

  const handleEdit = (node: OrgNode) => {
    setEditingNode(node);
    // Find parent logic is complex with tree, for simplicity in mock we might skip parent re-assignment visual or handle simply
    // For now, let's assume we edit properties but not structure in edit mode easily
    form.setFieldsValue({
        title: node.title,
        enTitle: node.enTitle,
        manager: node.manager,
        quotaTotal: node.quotaTotal,
        quotaUnit: node.quotaUnit,
        status: !node.disabled
    });
    setIsModalVisible(true);
  };

  const handleDelete = (key: string) => {
    Modal.confirm({
        title: '确认删除',
        content: '确定要删除该部门吗？删除后无法恢复。',
        okText: '确认',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => {
            const deleteLoop = (data: OrgNode[]): OrgNode[] => {
                return data.filter(item => {
                    if (item.key === key) return false;
                    if (item.children) {
                        item.children = deleteLoop(item.children);
                    }
                    return true;
                });
            };
            setTreeData(deleteLoop([...treeData]));
            message.success('删除成功');
        }
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
        const managerInfo = MOCK_USERS.find(u => u.name === values.manager);
        
        const newNode: OrgNode = {
            key: editingNode ? editingNode.key : Date.now().toString(),
            title: values.title,
            enTitle: values.enTitle,
            manager: values.manager,
            managerAvatar: managerInfo?.color || '#1890ff',
            memberCount: editingNode ? editingNode.memberCount : 0,
            quotaUsed: editingNode ? editingNode.quotaUsed : 0,
            quotaTotal: values.quotaTotal,
            quotaUnit: values.quotaUnit,
            disabled: !values.status,
            children: editingNode ? editingNode.children : [], // Preserve children if editing
            isLeaf: editingNode ? undefined : true // New nodes are leaves initially
        };

        if (editingNode) {
            // Update
            const updateLoop = (data: OrgNode[]): OrgNode[] => {
                return data.map(item => {
                    if (item.key === editingNode.key) {
                        return { ...newNode, children: item.children };
                    }
                    if (item.children) {
                        return { ...item, children: updateLoop(item.children) };
                    }
                    return item;
                });
            };
            setTreeData(updateLoop([...treeData]));
            message.success('更新成功');
        } else {
            // Add
            if (values.parentKey) {
                const addLoop = (data: OrgNode[]): OrgNode[] => {
                    return data.map(item => {
                        if (item.key === values.parentKey) {
                            return { 
                                ...item, 
                                children: [...(item.children || []), newNode],
                                isLeaf: false 
                            };
                        }
                        if (item.children) {
                            return { ...item, children: addLoop(item.children) };
                        }
                        return item;
                    });
                };
                setTreeData(addLoop([...treeData]));
                setExpandedKeys(prev => [...prev, values.parentKey]);
            } else {
                setTreeData([...treeData, newNode]);
            }
            message.success('创建成功');
        }
        setIsModalVisible(false);
    });
  };

  // --- Render Helpers ---

  const renderTitle = (node: OrgNode) => {
    const isLeaf = !node.children || node.children.length === 0;
    
    // Calculate progress percent
    const percent = (node.quotaUsed / node.quotaTotal) * 100;
    let progressColor = '#1890ff';
    if (percent > 80) progressColor = '#ff4d4f';
    else if (percent > 60) progressColor = '#faad14';
    else if (node.enTitle === 'R&D DEPARTMENT') progressColor = '#52c41a'; 
    else if (node.enTitle === 'SHANGHAI BRANCH') progressColor = '#fa8c16'; 
    else if (node.enTitle === 'MARKETING DEPT') progressColor = '#722ed1'; 

    const moreMenu: MenuProps['items'] = [
        {
            key: 'add-sub',
            label: '添加子部门',
            icon: <FolderAddOutlined />,
            onClick: () => handleAdd(node)
        },
        {
            key: 'edit',
            label: '编辑部门',
            icon: <EditOutlined />,
            onClick: () => handleEdit(node)
        },
        {
            type: 'divider'
        },
        {
            key: 'delete',
            label: '删除部门',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(node.key)
        }
    ];

    if (node.disabled) {
        return (
            <div className="flex items-center justify-between w-full h-full pr-4 opacity-50">
                 <div className="flex items-center gap-3">
                    <HolderOutlined className="text-slate-600 cursor-move text-lg mr-2" />
                    <span className="text-slate-500 font-medium text-base">{node.title}</span>
                </div>
                <Button type="link" size="small" className="text-blue-500 p-0" onClick={() => handleEdit(node)}>恢复启用</Button>
            </div>
        );
    }

    return (
      <div className="flex items-center w-full h-full pr-4 group relative">
        {/* Drag Handle */}
        <HolderOutlined className="text-slate-600 cursor-move text-lg mr-4 group-hover:text-slate-400 transition-colors" />

        {/* Main Info */}
        <div className="flex-1 flex items-center gap-4 min-w-[200px]">
            <div>
                <div className="text-slate-200 font-medium text-base">{node.title}</div>
                {node.enTitle && <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{node.enTitle}</div>}
            </div>
        </div>

        {/* Manager */}
        <div className="w-[180px] flex items-center gap-3">
            {node.managerAvatar ? (
                <Avatar size="small" style={{ backgroundColor: node.managerAvatar }}>{node.manager?.[0]}</Avatar>
            ) : (
                <span className="w-6" /> // spacer
            )}
            <span className="text-slate-300 text-sm">{node.manager || '-'}</span>
        </div>

        {/* Members */}
        <div className="w-[120px] flex items-center gap-2 text-slate-400 text-sm">
            <TeamOutlined />
            <span>{node.memberCount} 人</span>
        </div>

        {/* Token Quota */}
        <div className="w-[300px] flex items-center gap-4">
             <div className="flex-1 flex flex-col justify-center">
                 <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                    <span>Token 配额</span>
                    <span>{node.quotaUsed}{node.quotaUnit} / {node.quotaTotal}{node.quotaUnit}</span>
                 </div>
                 {node.quotaTotal > 0 ? (
                     <Progress 
                        percent={percent} 
                        showInfo={false} 
                        size="small" 
                        strokeColor={progressColor} 
                        trailColor="rgba(255,255,255,0.1)"
                        strokeWidth={6}
                    />
                 ) : (
                    <div className="text-slate-600 text-xs">Quota: {node.quotaTotal}{node.quotaUnit}</div>
                 )}
             </div>
             
             {/* Actions */}
             <div className="flex items-center gap-2">
                <Tooltip title="编辑">
                    <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        className="text-slate-500 hover:text-white" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(node); }}
                    />
                </Tooltip>
                
                <Dropdown menu={{ items: moreMenu }} trigger={['click']}>
                    <Button 
                        type="text" 
                        icon={<MoreOutlined />} 
                        className="text-slate-500 rotate-90 hover:text-white"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </Dropdown>
             </div>
        </div>
      </div>
    );
  };

  const onDrop: TreeProps['onDrop'] = (info) => {
     console.log(info);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
           <Title level={2} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
                组织管理
           </Title>
           <Tag className="bg-[#1a2632] border-[#233648] text-blue-400 rounded px-2">部门总数: 12</Tag>
        </div>
        <div className="flex gap-3">
             <Input 
                prefix={<SearchOutlined className="text-slate-500" />} 
                placeholder="搜索部门或成员..." 
                className="bg-[#1a2632] border-[#233648] text-slate-200 placeholder-slate-500 hover:border-blue-500/50 focus:border-blue-500 w-[240px]"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
            />
             <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                className="bg-blue-600 hover:bg-blue-500 border-none"
                onClick={() => handleAdd()}
            >
                添加部门
            </Button>
        </div>
      </div>

      <div className="flex-1 bg-[#111a22] border border-[#233648] rounded-xl overflow-hidden flex flex-col mb-6">
          <div className="p-4 border-b border-[#233648] flex justify-between items-center">
              <div>
                  <h3 className="text-white font-bold text-lg m-0">公司架构</h3>
                  <p className="text-slate-500 text-xs m-0 mt-1">拖拽部门可调整层级与排序</p>
              </div>
              <Button size="small" className="bg-[#1a2632] border-[#233648] text-slate-400" onClick={handleCollapseAll}>
                 {expandedKeys.length > 0 ? '全部折叠' : '全部展开'}
              </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-tree-container">
             <Tree
                className="bg-transparent text-slate-200 w-full"
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={onExpand}
                blockNode
                draggable
                onDrop={onDrop}
                titleRender={(node) => renderTitle(node as OrgNode)}
                selectable={false}
                showIcon={false}
                switcherIcon={(props) => {
                    if (props.isLeaf) return null;
                    return props.expanded ? <CaretDownOutlined className="text-slate-500" /> : <CaretRightOutlined className="text-slate-500" />;
                }}
                showLine={{ showLeafIcon: false }}
             />
          </div>
      </div>

      {/* Footer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111a22] p-6 rounded-xl border border-[#233648]">
             <div className="flex items-center gap-3 mb-2">
                <DeploymentUnitOutlined className="text-blue-500 text-lg" />
                <span className="text-slate-300 font-medium">全公司 Token 配额</span>
             </div>
             <div className="text-2xl font-bold text-white mb-3">
                3.82 <span className="text-slate-500 text-lg font-normal">/ 5.00 B</span>
             </div>
             <Progress percent={76.4} showInfo={false} strokeColor="#1890ff" trailColor="#1f2937" strokeWidth={8} />
        </div>

        <div className="bg-[#111a22] p-6 rounded-xl border border-[#233648]">
             <div className="flex items-center gap-3 mb-2">
                <UserOutlined className="text-green-500 text-lg" />
                <span className="text-slate-300 font-medium">成员分布情况</span>
             </div>
             <div className="text-2xl font-bold text-white mb-1">
                117 <span className="text-slate-400 text-base font-normal">名成员</span>
             </div>
             <div className="text-slate-500 text-xs">平均每个部门 9.75 人</div>
        </div>

        <div className="bg-[#111a22] p-6 rounded-xl border border-[#233648]">
             <div className="flex items-center gap-3 mb-2">
                <WarningOutlined className="text-amber-500 text-lg" />
                <span className="text-slate-300 font-medium">配额预警</span>
             </div>
             <div className="text-xl font-bold text-white mb-1">
                2 <span className="text-slate-400 text-base font-normal">个部门配额告急</span>
             </div>
             <div className="text-amber-500/80 text-xs">研发部 & 上海分公司 超过 70%</div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={editingNode ? "编辑部门" : "新增部门"}
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
                name="parentKey"
                label="上级部门"
                hidden={!!editingNode} // Hide parent selection when editing for simplicity, or enable if move logic is added
            >
                <TreeSelect
                    treeData={treeData}
                    placeholder="选择上级部门（留空为根部门）"
                    treeDefaultExpandAll
                    allowClear
                />
            </Form.Item>

            <Form.Item
                name="title"
                label="部门名称"
                rules={[{ required: true, message: '请输入部门名称' }]}
            >
                <Input placeholder="例如：研发部" />
            </Form.Item>

            <Form.Item
                name="enTitle"
                label="英文名称 (可选)"
            >
                <Input placeholder="例如：R&D DEPARTMENT" />
            </Form.Item>

            <Form.Item
                name="manager"
                label="部门负责人"
            >
                <Select placeholder="选择负责人">
                    {MOCK_USERS.map(user => (
                        <Option key={user.name} value={user.name}>
                            <Space>
                                <Avatar size="small" style={{ backgroundColor: user.color }}>{user.name[0]}</Avatar>
                                {user.name}
                            </Space>
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
                <Form.Item
                    name="quotaTotal"
                    label="Token 配额"
                    rules={[{ required: true }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    name="quotaUnit"
                    label="单位"
                    rules={[{ required: true }]}
                >
                    <Select>
                        <Option value="M">M (百万)</Option>
                        <Option value="B">B (十亿)</Option>
                    </Select>
                </Form.Item>
            </div>

            <Form.Item
                name="status"
                label="部门状态"
                valuePropName="checked"
            >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
        </Form>
      </Modal>
      
      <style>{`
        .custom-tree-container .ant-tree-node-content-wrapper {
            width: 100%;
            background-color: #162029;
            border-radius: 8px;
            margin-bottom: 8px;
            border: 1px solid #233648;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            height: 64px; /* Fixed height for consistency */
            padding: 0 16px 0 8px !important; /* Adjust padding */
        }
        .custom-tree-container .ant-tree-node-content-wrapper:hover {
            background-color: #1c2833 !important;
            border-color: #304a63;
        }
        .custom-tree-container .ant-tree-treenode {
            width: 100%;
            padding-bottom: 4px;
            display: flex;
            align-items: flex-start; /* Align top to handle variable height if needed, but here fixed */
        }
        /* Hide default switcher logic area but keep structure */
        .custom-tree-container .ant-tree-switcher {
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            width: 24px; /* Reduce width */
            align-self: flex-start; /* Align with top of row card */
            margin-top: 22px; /* Center vertically relative to 64px card height: (64-icon)/2 approx */
            margin-right: 4px;
            z-index: 10;
        }
        .custom-tree-container .ant-tree-indent-unit {
            width: 24px; /* Reduce indentation width */
            position: relative;
        }
        .custom-tree-container .ant-tree-indent-unit::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            border-right: 1px solid #233648;
        }
        /* Remove default padding/margin issues */
        .custom-tree-container .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background-color: #162029;
        }
      `}</style>
    </div>
  );
};

export default OrgManagement;
