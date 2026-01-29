import React, { useEffect, useState, useMemo } from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { getCurrentUserMenus } from '../services/api';

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
import { getToken } from '../services/auth';

const { Content } = Layout;

/** 从菜单树收集所有可访问的前端 path（type=menu 的 path） */
function collectMenuPaths(items: UserMenuItem[] | undefined): string[] {
  if (!items?.length) return [];
  const paths: string[] = [];
  function walk(nodes: UserMenuItem[]) {
    for (const n of nodes) {
      if (n.type === 'menu' && n.path) paths.push(n.path);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(items);
  return paths;
}

/** 当前 pathname 是否在允许的菜单路径内（精确或子路径） */
function isPathAllowed(pathname: string, allowedPaths: string[]): boolean {
  if (allowedPaths.length === 0) return true;
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '') || '/';
  for (const p of allowedPaths) {
    const base = p === '/' ? '/' : p.replace(/\/$/, '') || '/';
    if (normalized === base) return true;
    if (base !== '/' && normalized.startsWith(base + '/')) return true;
  }
  return false;
}

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenus, setUserMenus] = useState<UserMenuItem[] | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    getCurrentUserMenus()
      .then((res) => {
        if (res.code === 200 && Array.isArray(res.data)) setUserMenus(res.data);
        else setUserMenus([]);
      })
      .catch(() => setUserMenus([]));
  }, []);

  const allowedPaths = useMemo(() => collectMenuPaths(userMenus ?? undefined), [userMenus]);

  useEffect(() => {
    if (userMenus === null) return;
    const pathname = location.pathname;
    if (allowedPaths.length > 0 && !isPathAllowed(pathname, allowedPaths)) {
      const first = allowedPaths.find((p) => p && p !== 'Layout');
      navigate(first === '/' || !first ? '/' : first, { replace: true });
    }
  }, [userMenus, location.pathname, allowedPaths, navigate]);

  const isSkillsPage = location.pathname.startsWith('/skills');
  const isUserPage = location.pathname.includes('/settings/users');
  const isNoPaddingPage = isSkillsPage || isUserPage;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#137fec',
          colorBgContainer: '#1a2632', 
          colorBgBase: '#101922', 
          colorBorder: '#233648',
          colorText: '#e2e8f0', // text-slate-200ish
          colorTextSecondary: '#94a3b8', // text-slate-400
        },
        components: {
          Menu: {
            itemSelectedBg: 'rgba(19, 127, 236, 0.1)',
            itemSelectedColor: '#137fec',
            itemColor: '#94a3b8', 
            colorBgContainer: '#111a22',
          },
          Layout: {
            siderBg: '#111a22',
            headerBg: 'rgba(17, 26, 34, 0.8)',
            bodyBg: '#101922',
          },
          Input: {
            colorBgContainer: '#1a2632',
            colorBorder: '#334155',
            colorTextPlaceholder: '#64748b',
          },
          Table: {
            colorBgContainer: '#1a2632',
            headerBg: '#111a22',
            headerColor: '#94a3b8',
            borderColor: '#233648',
          },
          Modal: {
            contentBg: '#0d1117',
            headerBg: '#0d1117',
            titleColor: '#fff',
          }
        }
      }}
    >
      <Layout className="h-screen overflow-hidden bg-background-dark">
        <Sidebar userMenus={userMenus ?? undefined} />
        <Layout className="bg-background-dark">
          <TopHeader />
          <Content className={`scroll-smooth ${isNoPaddingPage ? 'p-0 overflow-hidden' : 'p-8 overflow-y-auto'}`} id="main-content">
            <div className={isNoPaddingPage ? 'h-full' : 'max-w-7xl mx-auto space-y-6'}>
                <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default MainLayout;
