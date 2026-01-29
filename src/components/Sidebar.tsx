import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSysConfig } from '../services/api';

/** 与 api.getCurrentUserMenus 返回的菜单项结构一致 */
interface UserMenuItem {
  id: string;
  name: string;
  type: 'directory' | 'menu';
  path?: string;
  permission?: string;
  icon?: string;
  sort?: number;
  parent_id?: string;
  children?: UserMenuItem[];
}
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
  ClusterOutlined,
  RocketOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;
const { Title } = Typography;

const ICON_MAP: Record<string, React.ReactNode> = {
  AppstoreOutlined: <AppstoreOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  KeyOutlined: <KeyOutlined />,
  ReadOutlined: <ReadOutlined />,
  ToolOutlined: <ToolOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  UserOutlined: <UserOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  RocketOutlined: <RocketOutlined />,
};

function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  return ICON_MAP[iconName] ?? null;
}

type MenuItemType = {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  children?: MenuItemType[];
};

function buildMenuItemsFromUserMenus(items: UserMenuItem[] | undefined): MenuItemType[] {
  if (!items?.length) return [];
  const result: MenuItemType[] = [];
  for (const n of items) {
    const key = n.type === 'menu' && n.path ? n.path : n.id;
    const icon = getIcon(n.icon);
    if (n.type === 'directory') {
      const children = buildMenuItemsFromUserMenus(n.children);
      result.push({
        key,
        icon,
        label: n.name,
        children: children.length > 0 ? children : undefined,
      });
    } else {
      result.push({ key, icon, label: n.name });
    }
  }
  return result;
}

/** 根据 pathname 计算当前选中的 menu key（取最长匹配的 path） */
function getSelectedKeyFromPath(pathname: string, items: UserMenuItem[] | undefined): string {
  if (!items?.length) return pathname || '/';
  let best = '';
  function walk(nodes: UserMenuItem[]) {
    for (const n of nodes) {
      if (n.type === 'menu' && n.path) {
        const p = n.path === '/' ? '/' : n.path.replace(/\/$/, '');
        const norm = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
        if (norm === p || (p !== '/' && norm.startsWith(p + '/'))) {
          if (p.length > best.length) best = p;
        }
      }
      if (n.children?.length) walk(n.children);
    }
  }
  walk(items);
  return best || pathname || '/';
}

interface SidebarProps {
  userMenus?: UserMenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ userMenus }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sysConfig, setSysConfig] = useState<{ site_logo?: string; site_name?: string }>({});

  const menuItems = useMemo(() => buildMenuItemsFromUserMenus(userMenus), [userMenus]);
  const selectedKeys = useMemo(
    () => [getSelectedKeyFromPath(location.pathname, userMenus) || '/'],
    [location.pathname, userMenus]
  );

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await getSysConfig();
        if (res.code === 200) {
          setSysConfig(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key === '/' ? '/' : key);
    }
  };

  const displayItems =
    menuItems.length > 0
      ? menuItems
      : [
          { key: '/', icon: <AppstoreOutlined />, label: '仪表盘' },
        ];

  return (
    <Sider
      width={256}
      className="h-full border-r border-[#233648] bg-[#111a22] flex flex-col shrink-0"
      style={{ backgroundColor: '#111a22', borderRight: '1px solid #233648' }}
      trigger={null}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 pb-2">
          <div
            className="flex items-center gap-3 mb-8 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20 text-white overflow-hidden">
              {sysConfig.site_logo ? (
                <img
                  src={sysConfig.site_logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <DeploymentUnitOutlined style={{ fontSize: '24px' }} />
              )}
            </div>
            <div className="flex flex-col">
              <Title
                level={5}
                style={{ color: 'white', margin: 0, fontSize: '16px', lineHeight: 1.2 }}
              >
                {sysConfig.site_name || 'AI Infra Gateway'}
              </Title>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            onClick={handleMenuClick}
            style={{ backgroundColor: 'transparent', border: 'none' }}
            items={displayItems}
            theme="dark"
          />
        </div>
      </div>
    </Sider>
  );
};

export default Sidebar;
