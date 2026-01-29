import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, getToken, setToken, setStoredUser, setRemember, getRemember } from '../services/auth';
import { getSysConfig } from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [sysConfig, setSysConfig] = useState<{ site_logo?: string; site_name?: string }>({});

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

  useEffect(() => {
    setRememberMe(getRemember());
  }, []);

  useEffect(() => {
    if (getToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const res = await login(values.username.trim(), values.password);
      if (res.code === 200 && res.data) {
        setToken(res.data.token);
        setStoredUser(res.data);
        setRemember(!!values.remember);
        message.success('登录成功');
        navigate('/', { replace: true });
      } else {
        message.error(res.msg || '登录失败');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { msg?: string } } }).response?.data?.msg
        : null;
      message.error(msg || '登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gateway-login-page">
      <div className="gateway-login-bg" />
      <div className="gateway-login-content">
        <header className="gateway-login-header">
          <div className="gateway-login-logo">
            {sysConfig.site_logo ? (
              <img src={sysConfig.site_logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="gateway-login-logo-icon" />
            )}
          </div>
          <h1 className="gateway-login-title">{sysConfig.site_name || 'AI Infra Gateway'}</h1>
          <p className="gateway-login-subtitle">企业级 AI 基础设施管理底座</p>
        </header>

        <div className="gateway-login-card">
          <h2 className="gateway-login-card-title">系统登录</h2>
          <Form
            name="gateway-login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            initialValues={{ remember: rememberMe }}
          >
            <Form.Item
              name="username"
              label="用户名/邮箱"
              labelCol={{ span: 24 }}
              rules={[{ required: true, message: '请输入用户名或邮箱' }]}
            >
              <Input
                prefix={<UserOutlined className="gateway-input-icon" />}
                placeholder="请输入用户名或邮箱"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              labelCol={{ span: 24 }}
              rules={[{ required: true, message: '请输入登录密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="gateway-input-icon" />}
                placeholder="请输入登录密码"
                autoComplete="current-password"
                iconRender={(visible) =>
                  visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>
            <div className="gateway-login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a className="gateway-login-forgot" href="#" onClick={(e) => e.preventDefault()}>
                忘记密码?
              </a>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} className="gateway-login-btn">
                登录 <ArrowRightOutlined />
              </Button>
            </Form.Item>
            <p className="gateway-login-help">
              遇到问题? <a href="#">联系管理员</a>
            </p>
          </Form>
        </div>

        <footer className="gateway-login-footer">
          <div>SECURE INFRASTRUCTURE NODE</div>
        </footer>
      </div>
    </div>
  );
};

export default Login;
