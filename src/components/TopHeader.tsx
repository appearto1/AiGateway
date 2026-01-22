import React from 'react';
import { Layout, Input, Button, Badge, Avatar, Typography } from 'antd';
import { SearchOutlined, BellOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import avatarImg from '../assets/avatar.webp';

const { Header } = Layout;
const { Text } = Typography;

const TopHeader: React.FC = () => {
  return (
    <Header className="h-16 border-b border-[#233648] backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8 shrink-0"
            style={{ backgroundColor: 'rgba(17, 26, 34, 0.8)', padding: '0 32px' }}>
      <div className="flex items-center gap-4">
        <h2 className="text-white text-lg font-bold tracking-tight m-0">系统概览</h2>
        <span className="self-center h-fit px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 leading-tight">PROD-Env</span>
      </div>
      
      <div className="flex items-center gap-4">
        <Input 
            prefix={<SearchOutlined className="text-slate-500" />} 
            placeholder="搜索 Request ID / App..." 
            className="w-64 bg-[#1a2632] border-[#334155] text-slate-200 placeholder-slate-500 hover:bg-[#1a2632] focus:bg-[#1a2632]"
            variant="filled"
        />
        
        <div className="h-6 w-px bg-[#334155] mx-1"></div>
        
        <Button 
            type="text" 
            icon={
                <Badge count={5} size="small" offset={[2, -2]}>
                    <BellOutlined style={{ fontSize: '20px' }} className="text-slate-400 hover:text-white" />
                </Badge>
            } 
            className="flex items-center justify-center size-9 hover:bg-[#233648]"
        />
        
        <Button 
            type="text" 
            icon={<SettingOutlined style={{ fontSize: '20px' }} className="text-slate-400 hover:text-white" />} 
            className="flex items-center justify-center size-9 hover:bg-[#233648]"
        />
        
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#1a2632] border border-[#233648] ml-2">
            <Avatar src={avatarImg} />
            <div className="flex flex-col overflow-hidden">
                <Text className="text-white text-sm font-medium truncate">管理员 (Admin)</Text>
                <Text className="text-slate-400 text-xs truncate">admin@infra.ai</Text>
            </div>
            <Button type="text" icon={<LogoutOutlined />} className="ml-auto text-slate-400 hover:text-white" />
        </div>
      </div>
    </Header>
  );
};

export default TopHeader;
