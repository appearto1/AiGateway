import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  Tag,
  Card,
  Pagination,
  Typography,
  Tooltip,
} from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getLoginLogList, type LoginLogItem } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

/** 解析 User-Agent 提取浏览器和操作系统信息 */
function parseUserAgent(ua: string | undefined): { browser: string; os: string; full: string } {
  if (!ua || ua === 'Unknown') {
    return { browser: '-', os: '-', full: ua || '-' };
  }

  // 提取操作系统
  let os = 'Unknown';
  let osVersion = '';
  if (ua.includes('Windows NT')) {
    const winMatch = ua.match(/Windows NT ([\d.]+)/);
    if (winMatch) {
      const version = winMatch[1];
      if (version.startsWith('10.0')) os = 'Windows 10/11';
      else if (version.startsWith('6.3')) os = 'Windows 8.1';
      else if (version.startsWith('6.2')) os = 'Windows 8';
      else if (version.startsWith('6.1')) os = 'Windows 7';
      else os = `Windows ${version}`;
    } else {
      os = 'Windows';
    }
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    const macMatch = ua.match(/Mac OS X ([\d_]+)/);
    if (macMatch) {
      osVersion = macMatch[1].replace(/_/g, '.');
      os = `macOS ${osVersion}`;
    } else {
      os = 'macOS';
    }
  } else if (ua.includes('Linux')) {
    os = 'Linux';
    if (ua.includes('Ubuntu')) os = 'Ubuntu';
    else if (ua.includes('Debian')) os = 'Debian';
    else if (ua.includes('CentOS')) os = 'CentOS';
  } else if (ua.includes('Android')) {
    const androidMatch = ua.match(/Android ([\d.]+)/);
    if (androidMatch) {
      os = `Android ${androidMatch[1]}`;
    } else {
      os = 'Android';
    }
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const iosMatch = ua.match(/OS ([\d_]+)/);
    if (iosMatch) {
      osVersion = iosMatch[1].replace(/_/g, '.');
      os = `iOS ${osVersion}`;
    } else {
      os = ua.includes('iPhone') ? 'iOS' : 'iPadOS';
    }
  }

  // 提取浏览器
  let browser = 'Unknown';
  let browserVersion = '';
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = 'Edge';
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = 'Chrome';
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = 'Firefox';
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/([\d.]+).*Safari/);
    browser = 'Safari';
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    const match = ua.match(/(?:Opera|OPR)\/([\d.]+)/);
    browser = 'Opera';
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'IE';
    const match = ua.match(/(?:MSIE |rv:)([\d.]+)/);
    browserVersion = match ? match[1] : '';
  }

  return {
    browser: browserVersion ? `${browser} ${browserVersion.split('.')[0]}` : browser,
    os,
    full: ua,
  };
}

const LoginLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<LoginLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getLoginLogList({
        keyword: keyword || undefined,
        status: statusFilter,
        page,
        pageSize,
      });
      if (res.code === 200 && res.data) {
        setList(res.data.list || []);
        setTotal(typeof res.data.total === 'number' ? res.data.total : 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, statusFilter]);

  const columns: ColumnsType<LoginLogItem> = [
    {
      title: '登录时间',
      dataIndex: 'last_login_time',
      key: 'last_login_time',
      width: 180,
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '登录账号',
      dataIndex: 'login_admin',
      key: 'login_admin',
      width: 140,
      ellipsis: true,
    },
    {
      title: '昵称',
      dataIndex: 'user_nick',
      key: 'user_nick',
      width: 120,
      ellipsis: true,
    },
    {
      title: '租户',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
      width: 120,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: 'IP',
      dataIndex: 'last_login_ip',
      key: 'last_login_ip',
      width: 140,
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      key: 'browser',
      width: 150,
      render: (val: string) => {
        const parsed = parseUserAgent(val);
        if (parsed.browser === '-') return '-';
        return (
          <Tooltip title={parsed.full}>
            <span className="text-slate-300">{parsed.browser}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '系统版本',
      dataIndex: 'browser',
      key: 'os',
      width: 150,
      render: (val: string) => {
        const parsed = parseUserAgent(val);
        if (parsed.os === '-') return '-';
        return (
          <Tooltip title={parsed.full}>
            <span className="text-slate-300">{parsed.os}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) =>
        status === 0 ? (
          <Tag color="success">成功</Tag>
        ) : (
          <Tag color="error">失败</Tag>
        ),
    },
    {
      title: '说明',
      dataIndex: 'log_content',
      key: 'log_content',
      ellipsis: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <HistoryOutlined className="text-blue-500 text-xl" />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              登录日志
            </Title>
            <span className="text-slate-500 text-xs">查看系统登录记录，含 IP、浏览器、系统版本、租户、成功/失败状态</span>
          </div>
        </div>
      </div>

      <Card className="border-[#233648] bg-[#111a22]" bordered={false}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input
            placeholder="账号 / 昵称 / 说明"
            prefix={<SearchOutlined className="text-slate-500" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchLogs}
            className="w-48 h-9 bg-[#1a2632] border-[#233648]"
            allowClear
          />
          <Select
            placeholder="状态"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            className="w-28 h-9"
            options={[
              { value: 0, label: '成功' },
              { value: 1, label: '失败' },
            ]}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => { setPage(1); fetchLogs(); }}
            className="h-9"
          >
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            className="h-9 bg-[#1a2632] border-[#233648] text-slate-400 hover:text-white"
          >
            刷新
          </Button>
        </div>

        <Table<LoginLogItem>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={false}
          size="small"
          className="dark-table"
        />

        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showTotal={(t) => `共 ${t} 条`}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps || 20);
            }}
            className="dark-pagination"
          />
        </div>
      </Card>
    </div>
  );
};

export default LoginLogs;
