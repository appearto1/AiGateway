import React, { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/chatApi';
import './Login.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const res = await login(values.username, values.password);
            if (res.code === 200) {
                localStorage.setItem('chat_token', res.data.token);
                localStorage.setItem('chat_user', JSON.stringify(res.data.user));
                message.success('登录成功');
                navigate('/chat');
            } else {
                message.error(res.msg || '登录失败');
            }
        } catch (error: any) {
            message.error(error.response?.data?.msg || '登录失败，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-login-container">
            <Card className="chat-login-card">
                <div className="chat-login-header">
                    <h1>AI 对话助手</h1>
                    <p>登录以开始使用</p>
                </div>
                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="用户名"
                        />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
