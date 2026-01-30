import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, message, Typography } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import { getChatAppConfig, updateChatAppConfig, getApps } from '../services/api';

const { Title } = Typography;

/** 系统配置页：仅配置当前租户的 AI 聊天应用（左侧系统配置菜单进入） */
const SystemConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [appOptions, setAppOptions] = useState<{ label: string; value: string }[]>([]);

  const loadConfig = async () => {
    setFetching(true);
    try {
      const res = await getChatAppConfig();
      if (res.code === 200 && res.data) {
        form.setFieldsValue({
          app_ids: (res.data as { app_ids?: string[] }).app_ids || [],
        });
      }
    } catch (e) {
      console.error('Failed to load chat app config:', e);
      message.error('加载配置失败');
    } finally {
      setFetching(false);
    }
  };

  /** 仅拉取当前租户的应用（用于聊天应用配置） */
  const loadTenantApps = async () => {
    try {
      const res = await getApps(undefined, 0, { scope: 'tenant' });
      if (res.code === 200 && Array.isArray(res.data)) {
        setAppOptions(
          (res.data as { id: string; name: string }[]).map((app) => ({
            label: app.name,
            value: app.id,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load apps:', e);
      message.error('加载应用列表失败');
    }
  };

  useEffect(() => {
    loadConfig();
    loadTenantApps();
  }, []);

  const onFinish = async (values: { app_ids?: string[] }) => {
    setLoading(true);
    try {
      const res = await updateChatAppConfig({ app_ids: values.app_ids || [] });
      if (res.code === 200) {
        message.success('保存成功');
      } else {
        message.error(res.msg || '保存失败');
      }
    } catch (e: any) {
      message.error(e.response?.data?.msg || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <Title level={4} className="!text-slate-200 mb-6 flex items-center gap-2">
        <SettingOutlined />
        系统配置
      </Title>

      <Card
        className="bg-[#0f1419] border-[#233648]"
        title={
          <span className="flex items-center gap-2 text-slate-200">
            <RobotOutlined />
            AI 聊天应用配置
          </span>
        }
      >
        <p className="text-slate-400 text-sm mb-4">
          选择当前租户下可用于 AI 聊天的应用，聊天页将只展示这些应用对应的模型。仅能选择本租户的应用。
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ app_ids: [] }}
        >
          <Form.Item
            name="app_ids"
            label={<span className="text-slate-300">聊天可用应用</span>}
          >
            <Select
              mode="multiple"
              placeholder="请选择应用（仅显示当前租户）"
              options={appOptions}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              className="w-full"
              dropdownClassName="gateway-dark-dropdown"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemConfig;
