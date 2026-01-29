import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModelProviders from './pages/ModelProviders';
import AppsAndTokens from './pages/AppsAndTokens';
import ModelPlayground from './pages/ModelPlayground';
import KnowledgeBase from './pages/KnowledgeBase';
import SkillEditor from './pages/SkillEditor';
import CallLogs from './pages/CallLogs';
import RoleManagement from './pages/RoleManagement';
import OrgManagement from './pages/OrgManagement';
import UserManagement from './pages/UserManagement';
import MenuManagement from './pages/MenuManagement';
import { Empty } from 'antd';
import { getToken } from './services/auth';
import McpManagement from './pages/McpManagement';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Placeholder component for other routes
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
    <Empty 
      description={
        <span className="text-slate-400 text-lg">
          {title} 页面正在开发中...
        </span>
      } 
      image={Empty.PRESENTED_IMAGE_SIMPLE} 
    />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="models" element={<ModelProviders />} />
          <Route path="apps" element={<AppsAndTokens />} />
          <Route path="playground" element={<ModelPlayground />} />
          <Route path="skills" element={<KnowledgeBase />} />
          <Route path="skills/:id" element={<SkillEditor />} />
          <Route path="mcp" element={<McpManagement />} />
          <Route path="logs" element={<CallLogs />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="menus" element={<MenuManagement />} />
          <Route path="settings/org" element={<OrgManagement />} />
          <Route path="settings/department" element={<Navigate to="/settings/org" replace />} />
          <Route path="settings/users" element={<UserManagement />} />
          <Route path="*" element={<PlaceholderPage title="404 Not Found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
