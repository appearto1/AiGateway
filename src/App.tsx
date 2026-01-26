import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ModelProviders from './pages/ModelProviders';
import AppsAndTokens from './pages/AppsAndTokens';
import ModelPlayground from './pages/ModelPlayground';
import KnowledgeBase from './pages/KnowledgeBase';
import SkillEditor from './pages/SkillEditor';
import CallLogs from './pages/CallLogs';
import { Empty } from 'antd';

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
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="models" element={<ModelProviders />} />
          <Route path="apps" element={<AppsAndTokens />} />
          <Route path="playground" element={<ModelPlayground />} />
          <Route path="skills" element={<KnowledgeBase />} />
          <Route path="skills/:id" element={<SkillEditor />} />
          <Route path="mcp" element={<PlaceholderPage title="MCP 工具集成" />} />
          <Route path="logs" element={<CallLogs />} />
          <Route path="settings/department" element={<PlaceholderPage title="部门管理" />} />
          <Route path="settings/users" element={<PlaceholderPage title="用户管理" />} />
          <Route path="*" element={<PlaceholderPage title="404 Not Found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
