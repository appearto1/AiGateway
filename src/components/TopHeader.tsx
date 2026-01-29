import React, { useState, useEffect } from 'react';
import { Layout, Input, Button, Badge, Avatar, Typography, Modal, Form, message, Upload } from 'antd';
import { SearchOutlined, BellOutlined, SettingOutlined, LogoutOutlined, KeyOutlined, LockOutlined, GlobalOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import avatarImg from '../assets/avatar.webp';
import { removeToken, getStoredUser, changePassword } from '../services/auth';
import { getSysConfig, updateSysConfig, uploadFile } from '../services/api';

const { Header } = Layout;
const { Text } = Typography;

const TopHeader: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<{ site_logo?: string; site_name?: string }>({});
  
  const siteLogo = Form.useWatch('site_logo', configForm);

  useEffect(() => {
    fetchConfig();
  }, []);

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

  const handleLogout = () => {
    removeToken();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async (values: any) => {
    setLoading(true);
    try {
      const res = await changePassword(values.oldPassword, values.newPassword);
      if (res.code === 200) {
        message.success('密码修改成功，请重新登录');
        setIsModalOpen(false);
        form.resetFields();
        handleLogout();
      } else {
        message.error(res.msg || '密码修改失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (values: any) => {
    setConfigLoading(true);
    try {
      const res = await updateSysConfig({
        name: values.site_name,
        logo: values.site_logo,
      });
      if (res.code === 200) {
        message.success('系统设置更新成功');
        setIsConfigModalOpen(false);
        fetchConfig();
        // 触发全局刷新或者刷新当前页面以应用新设置
        window.location.reload();
      } else {
        message.error(res.msg || '更新失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '网络错误');
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <Header className="h-16 border-b border-[#233648] backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8 shrink-0"
            style={{ backgroundColor: 'rgba(17, 26, 34, 0.8)', padding: '0 32px' }}>
      <div className="flex items-center gap-4">
        <h2 className="text-white text-lg font-bold tracking-tight m-0">{sysConfig.site_name || '系统概览'}</h2>
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
        
        {user?.has_system_role && (
          <>
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
                onClick={() => {
                  configForm.setFieldsValue({
                    site_name: sysConfig.site_name,
                    site_logo: sysConfig.site_logo
                  });
                  setIsConfigModalOpen(true);
                }}
            />
          </>
        )}
        
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#1a2632] border border-[#233648] ml-2">
            <Avatar src={user?.avatar || avatarImg} />
            <div className="flex flex-col overflow-hidden">
                <Text className="text-white text-sm font-medium truncate">{user?.nickname || user?.username || '用户'}</Text>
                <Text className="text-slate-400 text-xs truncate">{user?.email || user?.username || ''}</Text>
            </div>
            <div className="flex items-center gap-1 ml-auto">
                <Button 
                    type="text" 
                    icon={<KeyOutlined />} 
                    className="text-slate-400 hover:text-white" 
                    onClick={() => setIsModalOpen(true)} 
                    title="修改密码" 
                />
                <Button 
                    type="text" 
                    icon={<LogoutOutlined />} 
                    className="text-slate-400 hover:text-white" 
                    onClick={handleLogout} 
                    title="退出登录" 
                />
            </div>
        </div>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <KeyOutlined className="text-blue-500" />
            </div>
            <span className="text-white font-semibold">安全设置 - 修改密码</span>
          </div>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText="确认修改密码"
        cancelText="取消"
        width={420}
        centered
        className="dark-modal"
        footer={(footer) => (
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#233648]">
            {footer}
          </div>
        )}
      >
        <div className="mb-6 text-slate-400 text-sm">
          为了您的账号安全，请定期更换密码。新密码长度建议在 6-20 位之间。
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
          requiredMark={false}
        >
          <Form.Item
            name="oldPassword"
            label={<span className="text-slate-300">当前原密码</span>}
            rules={[{ required: true, message: '请输入当前使用的原密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-slate-500" />} 
              placeholder="请输入当前原密码" 
              className="gateway-dark-input"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={<span className="text-slate-300">设置新密码</span>}
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少为 6 位' },
              { max: 20, message: '密码长度不能超过 20 位' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-slate-500" />} 
              placeholder="请输入 6-20 位新密码" 
              className="gateway-dark-input"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<span className="text-slate-300">确认新密码</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码以进行确认' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致，请检查'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-slate-500" />} 
              placeholder="请再次输入新密码" 
              className="gateway-dark-input"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <GlobalOutlined className="text-indigo-500" />
            </div>
            <span className="text-white font-semibold">系统设置 - 站点配置</span>
          </div>
        }
        open={isConfigModalOpen}
        onOk={() => configForm.submit()}
        onCancel={() => setIsConfigModalOpen(false)}
        confirmLoading={configLoading}
        okText="保存设置"
        cancelText="取消"
        width={420}
        centered
        className="dark-modal"
      >
        <div className="mb-6 text-slate-400 text-sm">
          修改站点的展示名称和Logo，这些更改将实时应用到整个系统。
        </div>
        <Form
          form={configForm}
          layout="vertical"
          onFinish={handleUpdateConfig}
          requiredMark={false}
        >
          <Form.Item
            name="site_name"
            label={<span className="text-slate-300">站点名称</span>}
            rules={[{ required: true, message: '请输入站点名称' }]}
          >
            <Input 
              placeholder="例如: AI Infra Gateway" 
              className="gateway-dark-input"
            />
          </Form.Item>
          <Form.Item
            name="site_logo"
            label={<span className="text-slate-300">站点 Logo (URL)</span>}
          >
            <div className="flex flex-col gap-3">
              <Input 
                placeholder="请输入 Logo 图片 URL" 
                className="gateway-dark-input"
              />
              <div className="flex items-center gap-4">
                <Upload
                  showUploadList={false}
                  beforeUpload={async (file) => {
                    try {
                      const res = await uploadFile(file);
                      if (res.code === 200 && res.data && res.data.length > 0) {
                        const url = res.data[0].url;
                        configForm.setFieldsValue({ site_logo: url });
                        message.success('图片上传成功');
                      }
                    } catch (error) {
                      message.error('图片上传失败');
                    }
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />} className="bg-[#1a2632] border-[#2d3d4d] text-slate-300 hover:text-white">
                    上传图片
                  </Button>
                </Upload>
                {siteLogo && (
                  <div className="size-10 rounded border border-[#233648] p-1 flex items-center justify-center bg-[#1a2632]">
                    <img src={siteLogo} alt="logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .dark-modal .ant-modal-content {
          background-color: #111a22;
          border: 1px solid #233648;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          padding: 24px;
        }
        .dark-modal .ant-modal-header {
          background-color: transparent;
          border-bottom: none;
          margin-bottom: 20px;
          padding: 0;
        }
        .dark-modal .ant-modal-title {
          font-size: 18px;
        }
        .dark-modal .ant-modal-close {
          color: #94a3b8;
          top: 20px;
          right: 20px;
        }
        .dark-modal .ant-modal-close:hover {
          color: white;
          background-color: rgba(255, 255, 255, 0.05);
        }
        .gateway-dark-input {
          background-color: #1a2632 !important;
          border-color: #2d3d4d !important;
          color: white !important;
          height: 40px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .gateway-dark-input:hover, .gateway-dark-input:focus, .gateway-dark-input-focused {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          background-color: #1a2632 !important;
        }
        .gateway-dark-input input {
          background-color: transparent !important;
          color: white !important;
        }
        .gateway-dark-input .ant-input-password-icon {
          color: #64748b !important;
        }
        .gateway-dark-input .ant-input-password-icon:hover {
          color: white !important;
        }
        .dark-modal .ant-btn-default {
          background-color: #1a2632;
          border-color: #2d3d4d;
          color: #94a3b8;
          height: 38px;
          padding: 0 20px;
          border-radius: 8px;
        }
        .dark-modal .ant-btn-default:hover {
          color: white !important;
          border-color: #3b82f6 !important;
          background-color: #1a2632 !important;
        }
        .dark-modal .ant-btn-primary {
          background-color: #3b82f6;
          height: 38px;
          padding: 0 20px;
          border-radius: 8px;
          font-weight: 500;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
        }
        .dark-modal .ant-btn-primary:hover {
          background-color: #2563eb !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
        }
        .dark-modal .ant-form-item-explain-error {
          font-size: 12px;
          margin-top: 4px;
        }
      `}</style>
    </Header>
  );
};

export default TopHeader;
