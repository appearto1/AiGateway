import React, { useState } from 'react';
import { 
  Select, 
  Button, 
  Typography, 
  Slider,
  Input,
  Space,
  Avatar,
  Tooltip,
  Modal,
  ConfigProvider,
  theme,
  message
} from 'antd';
import { 
  SendOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  CodeOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
  ThunderboltFilled,
  ClockCircleOutlined,
  DatabaseOutlined,
  BuildOutlined,
  CopyOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const ModelPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'user',
      content: '请帮我写一段 Python 代码，用于计算斐波那契数列的前 10 个数字。',
      time: '14:20:05'
    },
    {
      role: 'assistant',
      model: 'DeepSeek-V3',
      content: `当然！这是一个使用 Python 编写的简单代码：

def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]
print(fibonacci(10))

这段代码会输出：[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]。`,
      meta: {
        ttft: '184ms',
        tokens: 152,
        time: '1.2s',
        sessionId: 'sess_8f7a29...9a2'
      },
      thinking: false
    },
    {
      role: 'assistant',
      model: 'DeepSeek-V3',
      content: '',
      thinking: true
    }
  ]);

  return (
    <div className="flex h-[calc(100vh-64px-48px)] -m-8 overflow-hidden bg-[#101922]">
      {/* Left Sidebar - Configuration */}
      <div className="w-[320px] bg-[#111a22] border-r border-[#233648] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#233648] flex items-center gap-2">
          <SettingOutlined className="text-white" />
          <span className="text-white font-bold">模型设置</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Model Selection */}
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">厂商</div>
              <Select 
                defaultValue="deepseek" 
                className="w-full"
                options={[
                  { value: 'deepseek', label: 'DeepSeek' },
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic' },
                ]}
              />
            </div>
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">模型</div>
              <Select 
                defaultValue="deepseek-chat" 
                className="w-full"
                options={[
                  { value: 'deepseek-chat', label: 'deepseek-chat (V3)' },
                  { value: 'deepseek-coder', label: 'deepseek-coder' },
                ]}
              />
            </div>
          </div>

          <div className="h-px bg-[#233648]"></div>

          {/* Hyperparameters */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <SettingOutlined className="text-primary" />
               <span className="text-white font-bold text-sm">超参数设置</span>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">Temperature (温度)</span>
                <span className="text-primary text-xs font-mono">0.7</span>
              </div>
              <Slider defaultValue={70} tooltip={{ open: false }} className="m-0" />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">Top P (核采样)</span>
                <span className="text-primary text-xs font-mono">1.0</span>
              </div>
              <Slider defaultValue={100} tooltip={{ open: false }} className="m-0" />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">Max Tokens (最大长度)</span>
                <span className="text-slate-400 bg-[#1a2632] px-1.5 rounded text-[10px] font-mono border border-[#334155]">4096</span>
              </div>
              <Slider defaultValue={40} tooltip={{ open: false }} className="m-0" />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">频率惩罚</span>
                <span className="text-primary text-xs font-mono">0.0</span>
              </div>
              <Slider defaultValue={0} tooltip={{ open: false }} className="m-0" />
            </div>
          </div>

          <div className="h-px bg-[#233648]"></div>

          {/* Custom JSON */}
          <div>
            <div className="flex items-center gap-2 mb-2">
               <CodeOutlined className="text-slate-400" />
               <span className="text-slate-400 text-xs">自定义 JSON 参数</span>
            </div>
            <TextArea 
              rows={4} 
              className="bg-[#0d1117] border-[#233648] text-slate-300 font-mono text-xs"
              defaultValue={`{"presence_penalty": 0.0, ...}`}
            />
          </div>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-[#101922] relative h-full">
        {/* Chat Header */}
        <div className="h-14 border-b border-[#233648] flex items-center justify-between px-6 shrink-0 bg-[#111a22]">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-lg">模型测试</span>
            <Tooltip title="设置 System Prompt">
              <Button 
                type="text" 
                icon={<BuildOutlined />} 
                className="text-primary hover:text-white hover:bg-primary/20 bg-primary/10 border border-primary/20"
                onClick={() => setIsSystemModalOpen(true)}
              >
                系统提示词
              </Button>
            </Tooltip>
          </div>
          <Button type="text" icon={<DeleteOutlined />} className="text-slate-400 hover:text-white">
            清除历史
          </Button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>开始与模型对话...</p>
             </div>
          )}
          
          {/* System Prompt Display Badge (Optional, to show it's active) */}
          {systemPrompt && (
            <div className="flex justify-center">
                <Tooltip title={systemPrompt}>
                    <span className="bg-[#1a2632] text-slate-500 text-xs px-3 py-1 rounded-full border border-[#233648] cursor-help max-w-xs truncate">
                    System: {systemPrompt}
                    </span>
                </Tooltip>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'hidden' : 'bg-primary'
              }`}>
                {msg.role === 'assistant' && <RobotOutlined className="text-white" />}
              </div>
              
              <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{msg.model}</span>
                  </div>
                )}

                <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-[#1a2632] border border-[#233648] text-slate-200 rounded-tl-sm w-full'
                }`}>
                  {msg.thinking ? (
                    <div className="flex items-center gap-2 text-slate-400 italic">
                      <span>正在思考中...</span>
                    </div>
                  ) : (
                    <>
                      {msg.role === 'assistant' ? (
                        <div className="whitespace-pre-wrap font-mono text-xs">
                          {/* Simplified code rendering simulation */}
                          {msg.content.split('```').map((part: string, i: number) => {
                            if (i % 2 === 1) {
                              // Code block
                              return (
                                <div key={i} className="my-2 bg-[#111a22] border border-[#233648] rounded p-3 text-green-400 overflow-x-auto">
                                  {part}
                                </div>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </>
                  )}
                </div>

                {msg.meta && (
                  <div className="flex items-center gap-4 mt-2 ml-1">
                    <Tooltip title="Time To First Token">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                        <ThunderboltFilled className="text-green-500" />
                        <span>TTFT: <span className="text-green-400 font-mono">{msg.meta.ttft}</span></span>
                      </div>
                    </Tooltip>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                      <DatabaseOutlined className="text-slate-400" />
                      <span>Tokens: <span className="text-green-400 font-mono">{msg.meta.tokens}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                      <ClockCircleOutlined className="text-slate-400" />
                      <span>耗时: <span className="text-green-400 font-mono">{msg.meta.time}</span></span>
                    </div>
                    {msg.meta.sessionId && (
                        <div 
                            className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50 cursor-pointer hover:bg-[#1a2632] hover:text-slate-400 transition-colors group"
                            onClick={() => {
                                navigator.clipboard.writeText(msg.meta.sessionId);
                                message.success('Session ID 已复制');
                            }}
                            title="点击复制 Session ID"
                        >
                            <span className="text-slate-300 font-mono">id: {msg.meta.sessionId}</span>
                            <CopyOutlined className="opacity-0 group-hover:opacity-100 transition-opacity text-xs" />
                        </div>
                    )}
                  </div>
                )}
                
                {msg.time && msg.role === 'user' && (
                  <span className="text-slate-500 text-[10px] mt-1 mr-1">{msg.time}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0 mt-auto">
          <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden shadow-xl shadow-black/20 focus-within:border-primary/50 transition-colors">
            <TextArea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入 Prompt 进行测试..."
              autoSize={{ minRows: 3, maxRows: 8 }}
              className="bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 resize-none p-4 text-sm"
            />
            <div className="flex justify-between items-center px-3 py-2 bg-[#1a2632] border-t border-[#233648]/50">
              <div className="flex gap-1">
                <Button type="text" icon={<PaperClipOutlined />} className="text-slate-400 hover:text-white text-xs">附件</Button>
                <Button type="text" icon={<CodeOutlined />} className="text-slate-400 hover:text-white text-xs">变量模板</Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 hidden sm:inline-block">使用 Cmd + Enter 快速发送</span>
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  className="bg-primary hover:bg-blue-600 border-none shadow-lg shadow-blue-900/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Prompt Modal */}
      <ConfigProvider
        theme={{
            algorithm: theme.darkAlgorithm,
            token: {
                colorBgElevated: '#1a2632',
                colorBorder: '#233648',
                borderRadiusLG: 12,
            },
            components: {
                Modal: {
                    headerBg: '#1a2632',
                    contentBg: '#1a2632',
                    titleColor: 'white',
                },
                Input: {
                    colorBgContainer: '#111a22',
                    colorBorder: '#233648',
                    hoverBorderColor: '#137fec',
                    activeBorderColor: '#137fec',
                }
            }
        }}
      >
        <Modal
            open={isSystemModalOpen}
            onCancel={() => setIsSystemModalOpen(false)}
            onOk={() => setIsSystemModalOpen(false)}
            title={
                <div className="flex items-center gap-2 text-white">
                    <BuildOutlined className="text-primary" />
                    <span>设置系统提示词 (System Prompt)</span>
                </div>
            }
            okText="保存"
            cancelText="取消"
            width={600}
            styles={{
                mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
            }}
        >
            <div className="py-4">
                <p className="text-slate-400 text-xs mb-3">
                    系统提示词用于设定 AI 的行为模式、角色扮演或上下文约束。它将作为对话的第一条隐藏消息发送给模型。
                </p>
                <TextArea 
                    rows={8} 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="例如：你是一个专业的代码助手，请只输出代码，不要输出解释..."
                    className="text-white font-mono text-sm"
                />
            </div>
        </Modal>
      </ConfigProvider>
    </div>
  );
};

export default ModelPlayground;
