import React, { useState, useEffect } from 'react';
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
import { getOrgList, createOrg, updateOrg, deleteOrg } from '../services/api';
import type { OrgData } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface OrgNode extends DataNode {
  key: string;
  title: string;
  enTitle?: string;
  parentId?: string;
  manager?: string;
  managerAvatar?: string; // Color or Image URL
  memberCount: number;
  quotaUsed: number;
  quotaTotal: number;
  quotaUnit: 'M' | 'B';
  disabled?: boolean;
  level: number;
  children?: OrgNode[];
}

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
  const [treeData, setTreeData] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [parentKeyForAdd, setParentKeyForAdd] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Helper to map API data to Tree data
  const mapOrgDataToNode = (org: OrgData, level: number = 0): OrgNode => ({
    key: org.id,
    title: org.name,
    enTitle: org.en_name,
    parentId: org.parent_id,
    manager: org.manager,
    managerAvatar: MOCK_USERS.find(u => u.name === org.manager)?.color || '#1890ff', // Mock avatar for now
    memberCount: 0, // Backend doesn't return member count yet, using 0
    quotaUsed: org.quota_used || 0,
    quotaTotal: org.quota_total || 0,
    quotaUnit: (org.quota_unit as 'M' | 'B') || 'M',
    disabled: org.status === 0, // 0 for disabled/stopped, 1 for active
    level,
    children: org.children ? org.children.map(child => mapOrgDataToNode(child, level + 1)) : [],
    isLeaf: !org.children || org.children.length === 0
  });

  const fetchData = async () => {
    try {
        setLoading(true);
        const res = await getOrgList(searchValue);
        if (res.code === 200) {
            const data = res.data || [];
            const nodes = data.map(org => mapOrgDataToNode(org, 0));
            setTreeData(nodes);
            // Optionally auto-expand root nodes
            if (nodes.length > 0 && expandedKeys.length === 0) {
                setExpandedKeys(nodes.map(n => n.key));
            }
        } else {
            message.error(res.msg || '获取组织列表失败');
        }
    } catch (error) {
        console.error(error);
        message.error('获取组织列表失败');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchValue]);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const getAllKeys = (nodes: OrgNode[]): string[] => {
    let keys: string[] = [];
    nodes.forEach(node => {
        keys.push(node.key);
        if (node.children) {
            keys = keys.concat(getAllKeys(node.children));
        }
    });
    return keys;
  };

  const handleToggleExpand = () => {
    if (expandedKeys.length > 0) {
        setExpandedKeys([]);
    } else {
        setExpandedKeys(getAllKeys(treeData));
    }
  };

  // --- CRUD Handlers ---

  const handleAdd = (parentNode?: OrgNode) => {
    setEditingNode(null);
    setParentKeyForAdd(parentNode?.key as string || null);
    form.resetFields();
    
    const initialValues: any = { 
        quotaTotal: 100, 
        quotaUnit: 'M', 
        status: true 
    };
    if (parentNode) {
        initialValues.parentKey = parentNode.key;
    }
    form.setFieldsValue(initialValues);
    setIsModalVisible(true);
  };

  const handleEdit = (node: OrgNode) => {
    setEditingNode(node);
    setParentKeyForAdd(null);
    form.setFieldsValue({
        title: node.title,
        enTitle: node.enTitle,
        parentKey: node.parentId,
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
        onOk: async () => {
            try {
                const res = await deleteOrg(key);
                if (res.code === 200) {
                    message.success('删除成功');
                    fetchData();
                } else {
                    message.error(res.msg || '删除失败');
                }
            } catch (error) {
                message.error('删除失败');
            }
        }
    });
  };

    // Helper to find node
    const findNode = (nodes: OrgNode[], key: string): OrgNode | undefined => {
        for (const node of nodes) {
            if (node.key === key) return node;
            if (node.children) {
                const found = findNode(node.children, key);
                if (found) return found;
            }
        }
        return undefined;
    };

    // Helper to convert to MB for comparison
    const toMB = (val: number, unit: string) => {
        return unit === 'B' ? val * 1000 : val;
    };

    const handleModalOk = () => {
    form.validateFields().then(async values => {
        try {
            // Validate Quota against parent
            if (values.parentKey) {
                const parent = findNode(treeData, values.parentKey);
                if (parent) {
                    const parentTotal = toMB(parent.quotaTotal, parent.quotaUnit);
                    const currentTotal = toMB(values.quotaTotal, values.quotaUnit);
                    if (currentTotal > parentTotal) {
                         message.error(`配额不能超过上级部门 (${parent.quotaTotal}${parent.quotaUnit})`);
                         return;
                    }
                }
            }

            if (editingNode) {
                // Update
                const res = await updateOrg({
                    id: editingNode.key,
                    name: values.title,
                    en_name: values.enTitle,
                    parent_id: values.parentKey,
                    manager: values.manager,
                    quota_total: values.quotaTotal,
                    quota_unit: values.quotaUnit,
                    status: values.status ? 1 : 0
                });
                if (res.code === 200) {
                    message.success('更新成功');
                    fetchData();
                    setIsModalVisible(false);
                } else {
                    message.error(res.msg || '更新失败');
                }
            } else {
                // Create
                const res = await createOrg({
                    name: values.title,
                    en_name: values.enTitle,
                    parent_id: values.parentKey || '',
                    manager: values.manager,
                    quota_total: values.quotaTotal,
                    quota_unit: values.quotaUnit,
                    status: values.status ? 1 : 0
                });
                if (res.code === 200) {
                    message.success('创建成功');
                    fetchData();
                    // Auto expand parent if added sub-node
                    if (values.parentKey) {
                        setExpandedKeys(prev => [...prev, values.parentKey]);
                    }
                    setIsModalVisible(false);
                } else {
                    message.error(res.msg || '创建失败');
                }
            }
        } catch (error) {
            console.error(error);
            message.error('操作失败');
        }
    });
  };

  // --- Render Helpers ---

  const renderTitle = (node: OrgNode) => {
    // Check if node is expanded
    const isExpanded = expandedKeys.includes(node.key);
    const hasChildren = node.children && node.children.length > 0;
    
    // Toggle expand handler
    const handleExpandToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newKeys = isExpanded 
            ? expandedKeys.filter(k => k !== node.key)
            : [...expandedKeys, node.key];
        setExpandedKeys(newKeys);
    };

    // Calculate progress percent
    const percent = node.quotaTotal > 0 ? (node.quotaUsed / node.quotaTotal) * 100 : 0;
    
    // Determine styles based on level/name
    let progressColor = '#1890ff';
    let accentColor = 'bg-blue-500';
    let avatarBg = node.managerAvatar || '#1890ff';
    
    if (node.enTitle?.includes('R&D')) {
        progressColor = '#52c41a';
        accentColor = 'bg-emerald-500';
        avatarBg = '#52c41a';
    } else if (node.enTitle?.includes('MARKETING')) {
        progressColor = '#722ed1';
        accentColor = 'bg-purple-600';
        avatarBg = '#722ed1';
    } else if (node.enTitle?.includes('SHANGHAI')) {
        progressColor = '#fa8c16';
        accentColor = 'bg-orange-500';
        avatarBg = '#fa8c16';
    }

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

    // Common Drag Handle
    const DragHandle = () => (
        <HolderOutlined className="text-[#475569] cursor-move text-lg mr-2 group-hover:text-slate-400 transition-colors" />
    );

    // Common Expand Icon
    const ExpandIcon = () => (
        <div 
            onClick={handleExpandToggle}
            className={`mr-2 cursor-pointer transition-transform duration-200 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        >
            <CaretDownOutlined className="text-slate-400 text-sm" />
        </div>
    );

    // Connector Line for non-root nodes
    const ConnectorLine = () => {
        if (node.level === 0) return null;
        return (
            <div 
                className="absolute bg-[#475569]" 
                style={{ 
                    width: '28px', 
                    height: '1px', 
                    left: '-28px', 
                    top: '50%' 
                }} 
            />
        );
    };

    if (node.disabled) {
        return (
            <div className="flex items-center justify-between w-full h-full pr-4 pl-2 opacity-50 select-none relative">
                 <ConnectorLine />
                 <div className="flex items-center">
                    <DragHandle />
                    <span className="text-slate-500 font-medium text-base ml-2">{node.title}</span>
                    <span className="text-slate-600 text-xs ml-2">(已停用)</span>
                </div>
                <Button type="link" size="small" className="text-blue-500 p-0" onClick={() => handleEdit(node)}>恢复启用</Button>
            </div>
        );
    }

    // Unified Render for All Levels
    return (
        <div className="flex items-center w-full h-full pr-4 pl-4 group relative select-none">
            <ConnectorLine />
            
            {/* Drag Handle */}
            <DragHandle />
            
            {/* Expand Icon */}
            {hasChildren || node.level <= 1 ? <ExpandIcon /> : <div className="w-[22px] mr-2"></div>}

            {/* Left: Name */}
            <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                <div>
                    <div className="text-slate-100 font-bold text-sm flex items-center gap-2 tracking-wide">
                        {node.title}
                    </div>
                    {node.enTitle && <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{node.enTitle}</div>}
                </div>
            </div>

            {/* Middle: Manager */}
            <div className="w-[180px] flex items-center gap-3">
                {node.manager ? (
                    <>
                        <Avatar size="small" style={{ backgroundColor: avatarBg }} className="border border-white/10">{node.manager[0]}</Avatar>
                        <span className="text-slate-300 text-sm font-medium">{node.manager}</span>
                    </>
                ) : (
                        <span className="text-slate-600 text-sm">-</span>
                )}
            </div>

            {/* Middle: Members */}
            <div className="w-[120px] flex items-center gap-2 text-slate-400 text-sm">
                <TeamOutlined className="text-slate-500" />
                <span>{node.memberCount} 人</span>
            </div>

            {/* Right: Quota & Actions */}
            <div className="w-[300px] flex items-center gap-6">
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                        <span>Token 配额</span>
                        <span className={percent > 80 ? 'text-amber-500' : 'text-blue-400'}>
                            {node.quotaUsed}{node.quotaUnit} <span className="text-slate-600">/ {node.quotaTotal}{node.quotaUnit}</span>
                        </span>
                        </div>
                        <Progress 
                        percent={percent} 
                        showInfo={false} 
                        size="small" 
                        strokeColor={progressColor} 
                        trailColor="#1f2937"
                        strokeWidth={4}
                        className="m-0"
                    />
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        type="text" 
                        size="small"
                        icon={<EditOutlined />} 
                        className="text-slate-500 hover:text-white" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(node); }}
                    />
                    <Dropdown menu={{ items: moreMenu }} trigger={['click']}>
                        <Button 
                            type="text" 
                            size="small"
                            icon={<MoreOutlined />} 
                            className="text-slate-500 rotate-90 hover:text-white"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </Dropdown>
                    <Switch 
                        size="small" 
                        checked={!node.disabled} 
                        className="bg-slate-700 ml-2"
                        onClick={(checked, e) => { e.stopPropagation(); handleEdit(node); }}
                    />
                    </div>
            </div>
        </div>
    );
  };

  const onDrop: TreeProps['onDrop'] = async (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const dragNode = info.dragNode as unknown as OrgNode;
    const dropNode = info.node as unknown as OrgNode;

    let newParentId = '';

    // If dropped on top of a node (become child)
    if (!info.dropToGap) {
        newParentId = dropKey;
    } else {
        // Dropped into gap (become sibling)
        // If dropPosition is -1, dropped before. If 1, dropped after.
        // In both cases, parent is same as dropNode's parent.
        newParentId = dropNode.parentId || '';
    }

    // Prevent self-parenting or loop if backend doesn't check (frontend check)
    if (dragKey === newParentId) return;

    try {
        setLoading(true);
        // We currently only update the parent_id. 
        // For full sorting support, we'd need to calculate and update sort_order for siblings.
        // Assuming backend appends to end or handles order if we just change parent.
        const res = await updateOrg({
            id: dragKey,
            parent_id: newParentId
        });

        if (res.code === 200) {
            message.success('移动成功');
            fetchData();
        } else {
            message.error(res.msg || '移动失败');
        }
    } catch (error) {
        console.error(error);
        message.error('移动失败');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
           <Title level={2} style={{ color: 'white', margin: 0, fontSize: '24px' }}>
                组织管理
           </Title>
           <Tag className="bg-[#1a2632] border-[#233648] text-blue-400 rounded px-2">部门总数: {treeData.length > 0 ? '...' : 0}</Tag>
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

      {/* Stats Cards (Moved from Footer) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

      <div className="flex-1 bg-[#111a22] border border-[#233648] rounded-xl overflow-hidden flex flex-col mb-6">
          <div className="p-4 border-b border-[#233648] flex justify-between items-center">
              <div>
                  <h3 className="text-white font-bold text-lg m-0">公司架构</h3>
                  <p className="text-slate-500 text-xs m-0 mt-1">拖拽部门可调整层级与排序</p>
              </div>
              <Button size="small" className="bg-[#1a2632] border-[#233648] text-slate-400" onClick={handleToggleExpand}>
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
                switcherIcon={null} // Hide default switcher, using custom one in renderTitle
                showLine={false} // Drawing custom lines via CSS
             />
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
            >
                <TreeSelect
                    treeData={treeData}
                    fieldNames={{ label: 'title', value: 'key', children: 'children' }}
                    placeholder="选择上级部门（留空为根部门）"
                    treeDefaultExpandAll
                    allowClear
                    // Prevent selecting itself or children as parent (basic loop prevention)
                    // AntD TreeSelect handles loop prevention automatically if treeData is proper?
                    // Usually yes, but let's be safe if needed. For now simple enable.
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
            background-color: #111a22; /* Darker bg */
            border-radius: 12px;
            margin-bottom: 8px;
            border: 1px solid #233648;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            height: 72px;
            padding: 0 16px 0 8px !important;
            position: relative;
            z-index: 2;
        }
        .custom-tree-container .ant-tree-node-content-wrapper:hover {
            background-color: #162029 !important;
            border-color: #304a63;
        }
        
        /* Tree Lines Structure */
        .custom-tree-container .ant-tree-treenode {
            width: 100%;
            padding-bottom: 4px;
            display: flex;
            align-items: flex-start;
            position: relative;
        }

        /* Hide default switcher area but keep space if needed, 
           actually we hid switcherIcon so AntD might still render a placeholder. 
           We want to control the indent carefully. */
        .custom-tree-container .ant-tree-switcher {
            display: none !important; /* Completely hide default switcher */
        }

        /* Custom Indent Lines */
        .custom-tree-container .ant-tree-indent-unit {
            width: 32px;
            position: relative;
        }
        /* Vertical Line */
        .custom-tree-container .ant-tree-indent-unit::before {
            content: "";
            position: absolute;
            top: -10px; /* Extend up to cover gap */
            bottom: 0;
            left: 50%;
            border-right: 1px solid #475569;
            z-index: 0;
        }
        
        /* Stop line at middle for the last child */
        .custom-tree-container .ant-tree-treenode-leaf-last .ant-tree-indent-unit:last-child::before {
            bottom: 50%;
        }

        /* Hide line for top level if needed, but top level usually has no indent unit */
        
        /* Selection */
        .custom-tree-container .ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected {
            background-color: #111a22;
        }
      `}</style>
    </div>
  );
};

export default OrgManagement;
