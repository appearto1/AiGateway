import React from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';

const { Content } = Layout;

const MainLayout: React.FC = () => {
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
          }
        }
      }}
    >
      <Layout className="h-screen overflow-hidden bg-background-dark">
        <Sidebar />
        <Layout className="bg-background-dark">
          <TopHeader />
          <Content className="overflow-y-auto p-8 scroll-smooth" id="main-content">
            <div className="max-w-7xl mx-auto space-y-6">
                <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default MainLayout;
