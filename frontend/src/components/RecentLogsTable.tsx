import React from 'react';
import { Table, Button, ConfigProvider } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppUsageLogItem } from '../services/api';

interface RecentLogsTableProps {
    data: AppUsageLogItem[];
    loading?: boolean;
}

const columns: ColumnsType<AppUsageLogItem> = [
  {
    title: '时间 (TIME)',
    dataIndex: 'request_time',
    key: 'request_time',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (text) => <span className="text-slate-300 font-mono text-xs">{text}</span>,
  },
  {
    title: '请求 ID (REQUEST ID)',
    dataIndex: 'request_id',
    key: 'request_id',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (text) => (
        <span className="text-slate-300 font-mono text-xs truncate max-w-[120px] block" title={text}>
            {text}...
        </span>
    ),
  },
  {
    title: '应用 (APP)',
    dataIndex: 'app_name',
    key: 'app_name',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (text) => <span className="text-white font-medium">{text || '-'}</span>,
  },
  {
    title: '模型 (MODEL)',
    dataIndex: 'model',
    key: 'model',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (model) => {
        let colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (model.includes('claude')) colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        if (model.includes('gemini')) colorClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        if (model.includes('llama')) colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                {model}
            </span>
        );
    }
  },
  {
    title: '状态 (STATUS)',
    dataIndex: 'status',
    key: 'status',
    align: 'center',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (status) => {
        const isError = status >= 400;
        const colorClass = isError 
            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
            : 'bg-green-500/20 text-green-400 border-green-500/30';
        return (
             <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                {status}
             </span>
        );
    }
  },
  {
    title: '消耗 (TOKENS)',
    dataIndex: 'total_tokens',
    key: 'total_tokens',
    align: 'right',
    className: 'bg-[#111a22] text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-[#233648] px-6 py-4',
    render: (text) => <span className="text-slate-300 font-mono text-right block">{text}</span>,
  },
];

const RecentLogsTable: React.FC<RecentLogsTableProps> = ({ data = [], loading = false }) => {
  return (
    <ConfigProvider
        theme={{
            components: {
                Table: {
                    headerBg: '#111a22',
                    headerColor: '#94a3b8',
                    headerBorderRadius: 0,
                    cellPaddingBlock: 16, // px-4 = 16px
                    cellPaddingInline: 24, // px-6 = 24px
                },
                Button: {
                    defaultBg: '#111a22',
                    defaultBorderColor: '#334155',
                    defaultColor: '#cbd5e1', // slate-300
                    defaultHoverBg: '#111a22',
                    defaultHoverBorderColor: '#137fec',
                    defaultHoverColor: '#137fec',
                }
            }
        }}
    >
        <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#233648] flex justify-between items-center">
            <h3 className="text-white text-lg font-bold m-0">最近调用日志 (Recent Logs)</h3>
            <div className="flex gap-2">
                <Button className="px-3 py-1.5 h-auto rounded-lg text-xs font-normal">
                    导出日志
                </Button>
                <Button icon={<ReloadOutlined style={{ fontSize: '14px' }} />} className="px-3 py-1.5 h-auto rounded-lg text-xs font-normal flex items-center gap-1">
                    刷新
                </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table 
                columns={columns} 
                dataSource={data} 
                rowKey="id"
                pagination={false} 
                loading={loading}
                rowClassName="hover:bg-[#1f2d3a] transition-colors group text-sm border-b border-[#233648]"
                className="custom-table"
            />
          </div>
        </div>
    </ConfigProvider>
  );
};

export default RecentLogsTable;
