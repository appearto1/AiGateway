import React from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';

const { Content } = Layout;

const MainLayout: React.FC = () => {
  const location = useLocation();
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
        <Sidebar />
        <Layout className="bg-background-dark">
          {!isUserPage && <TopHeader />}
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
