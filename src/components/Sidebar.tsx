import React, { useEffect, useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  KeyOutlined,
  ReadOutlined,
  ToolOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  UserOutlined,
  DeploymentUnitOutlined,
  SafetyCertificateOutlined,
  ClusterOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { Text, Title } = Typography;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);

  // Sync selection with URL
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard'; // remove leading slash
    // Handle nested routes mapping if needed, for now simple mapping
    if (path === '') setSelectedKeys(['dashboard']);
    else if (path.includes('models')) setSelectedKeys(['models']);
    else if (path.includes('apps')) setSelectedKeys(['apps']);
    else if (path.includes('skills')) setSelectedKeys(['skills']);
    else if (path.includes('mcp')) setSelectedKeys(['mcp']);
    else if (path.includes('logs')) setSelectedKeys(['logs']);
    else if (path.includes('org')) setSelectedKeys(['org']);
    else if (path.includes('department')) setSelectedKeys(['org']);
    else if (path.includes('users')) setSelectedKeys(['users']);
    else if (path.includes('roles')) setSelectedKeys(['roles']);
    else if (path.includes('menus')) setSelectedKeys(['menus']);
    else setSelectedKeys([path]);
  }, [location]);

  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
        case 'dashboard':
            navigate('/');
            break;
        case 'models':
            navigate('/models');
            break;
        case 'apps':
            navigate('/apps');
            break;
        case 'skills':
            navigate('/skills');
            break;
        case 'mcp':
            navigate('/mcp');
            break;
        case 'logs':
            navigate('/logs');
            break;
        case 'org':
            navigate('/settings/org');
            break;
        case 'users':
            navigate('/settings/users');
            break;
        case 'roles':
            navigate('/roles');
            break;
        case 'menus':
            navigate('/menus');
            break;
        default:
            navigate('/');
    }
  };

  return (
    <Sider
      width={256}
      className="h-full border-r border-[#233648] bg-[#111a22] flex flex-col shrink-0"
      style={{ backgroundColor: '#111a22', borderRight: '1px solid #233648' }}
      trigger={null}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20 text-white">
                    <DeploymentUnitOutlined style={{ fontSize: '24px' }} />
                </div>
                <div className="flex flex-col">
                    <Title level={5} style={{ color: 'white', margin: 0, fontSize: '16px', lineHeight: 1.2 }}>AI Infra Gateway</Title>
                    <Text className="text-slate-400 text-xs font-mono mt-0.5">v2.4.0-stable</Text>
                </div>
            </div>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
             <Menu
                mode="inline"
                selectedKeys={selectedKeys}
                onClick={handleMenuClick}
                style={{ backgroundColor: 'transparent', border: 'none' }}
                items={[
                    { key: 'dashboard', icon: <AppstoreOutlined />, label: '仪表盘 (Dashboard)' },
                    { key: 'models', icon: <DatabaseOutlined />, label: '模型渠道管理' },
                    { key: 'apps', icon: <KeyOutlined />, label: '应用与令牌' },
                    { key: 'skills', icon: <ReadOutlined />, label: '知识库 (Skills)' },
                    { key: 'mcp', icon: <ToolOutlined />, label: 'MCP 工具集成' },
                    { key: 'logs', icon: <FileTextOutlined />, label: '调用日志' },
                    { type: 'divider', style: { borderColor: '#233648', margin: '10px 0' } },
                    { 
                        type: 'group', 
                        label: <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-0">系统管理</span>, 
                        children: [
                            { key: 'org', icon: <ApartmentOutlined />, label: '组织管理 (Org)' },
                            { key: 'users', icon: <UserOutlined />, label: '用户管理' },
                            { key: 'roles', icon: <SafetyCertificateOutlined />, label: '角色管理' },
                            { key: 'menus', icon: <ClusterOutlined />, label: '菜单权限管理' },
                        ]
                    }
                ]}
                theme="dark"
             />
        </div>

      </div>
    </Sider>
  );
};

export default Sidebar;
