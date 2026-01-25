import React, { useState, useEffect, useRef } from 'react';
import { 
  Select, 
  Button, 
  Slider,
  Input,
  Space,
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
  SettingOutlined,
  ThunderboltFilled,
  ClockCircleOutlined,
  DatabaseOutlined,
  BuildOutlined, 
  LoadingOutlined, 
  LinkOutlined, 
  CloseOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  CheckCircleFilled
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import type { ChatMessage, ChatCompletionRequest } from '../services/api';
import { getOpenAIModels, chatCompletionsStream } from '../services/api';

const { TextArea } = Input;

interface ExtendedChatMessage extends ChatMessage {
  time?: string;
  model?: string;
  meta?: {
    ttft: string;
    tokens: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    time: string;
    requestId?: string;
  };
  reasoning?: string;
  reasoningCollapsed?: boolean;
  thinking?: boolean;
  steps?: {
    type: 'thought' | 'tool' | 'result';
    content?: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    toolName?: string;
    toolArgs?: string;
    index?: number;
    displayName?: string;
  }[];
}

const ModelPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appToken, setAppToken] = useState<string>(localStorage.getItem('playground_app_token') || '');
  
  // Model Settings State
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Hyperparameters
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [customParams, setCustomParams] = useState('{\n  "frequency_penalty": 0,\n  "presence_penalty": 0\n}');
  const [isJsonValid, setIsJsonValid] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchConfig = async () => {
    // 优先尝试从 localStorage 获取 token 加载模型
    if (appToken) {
        await fetchModelsByToken(appToken);
    }
  };

  const fetchModelsByToken = async (token: string) => {
      try {
          setIsLoading(true);
          // 使用 api.ts 中的 getOpenAIModels 函数
          const res = await getOpenAIModels(token);
          
          if (res.data && Array.isArray(res.data)) {
              const modelList = res.data.map((m: any) => m.id);
              setAvailableModels(modelList);
              if (modelList.length > 0 && !modelList.includes(selectedModel)) {
                  setSelectedModel(modelList[0]);
              }
              message.success(`成功加载 ${modelList.length} 个授权模型`);
              localStorage.setItem('playground_app_token', token);
          } else {
              throw new Error('获取授权模型失败：响应数据格式错误');
          }
      } catch (e: any) {
          message.error(e.message || "Token 无效或获取模型失败");
          setAvailableModels([]);
          setSelectedModel('');
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJsonChange = (value: string) => {
    setCustomParams(value);
    try {
        if (!value.trim()) {
            setIsJsonValid(true);
            return;
        }
        JSON.parse(value);
        setIsJsonValid(true);
    } catch (e) {
        setIsJsonValid(false);
    }
  };

  const formatJson = () => {
    try {
        const parsed = JSON.parse(customParams);
        setCustomParams(JSON.stringify(parsed, null, 2));
        setIsJsonValid(true);
    } catch (e) {
        message.error("JSON 格式错误，无法格式化");
    }
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isLoading) return;
    
    const userMsg: ExtendedChatMessage = {
        role: 'user',
        content: prompt,
        time: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    const assistantMsg: ExtendedChatMessage = {
        role: 'assistant',
        model: selectedModel,
        content: '',
        thinking: true
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
        const startTime = Date.now();
        const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
        
        const payloadMessages: ChatMessage[] = [];
        if (systemPrompt) payloadMessages.push({ role: 'system', content: systemPrompt });
        payloadMessages.push(...chatHistory, { role: 'user', content: prompt });

        let extraParams = {};
        try {
            if (customParams.trim()) {
                extraParams = JSON.parse(customParams);
            }
        } catch (e) {
            console.error("Invalid custom params JSON", e);
        }

        // 使用 api.ts 中的 chatCompletionsStream 函数
        const response = await chatCompletionsStream({
            model: selectedModel,
            messages: payloadMessages,
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
            stream: true,
            ...extraParams
        } as ChatCompletionRequest, appToken);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.msg || `请求失败 (${response.status})`);
        }

        const headerRequestId = response.headers.get('X-Request-Id') || response.headers.get('Request-Id');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let fullReasoning = '';
        let ttft = 0;
        let finalRequestId = headerRequestId || '';
        let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;

        // 初始设置 requestId 到 meta
        setMessages(prev => {
            const last = [...prev];
            last[last.length - 1] = {
                ...last[last.length - 1],
                meta: {
                    ttft: '-',
                    tokens: 0,
                    time: '-',
                    requestId: finalRequestId || undefined
                }
            };
            return last;
        });

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                if (ttft === 0) ttft = Date.now() - startTime;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            
                            // 1. 处理自定义工具信息事件 (x_tool_info)
                            if (data.type === 'x_tool_info' && data.info) {
                                setMessages(prev => {
                                    const last = [...prev];
                                    const currentMsg = last[last.length - 1];
                                    let updatedSteps = [...(currentMsg.steps || [])];
                                    
                                    // 遍历现有的步骤，如果 name 匹配，则更新为 Title
                                    updatedSteps = updatedSteps.map(step => {
                                        if (step.type === 'tool' && step.toolName && data.info[step.toolName]) {
                                            return { ...step, displayName: data.info[step.toolName], status: 'completed' };
                                        }
                                        return step;
                                    });
                                    
                                    // 同时也把所有 pending/running 的标记为 completed (作为兜底)
                                    updatedSteps = updatedSteps.map(s => s.status === 'running' ? { ...s, status: 'completed' } : s);

                                    last[last.length - 1] = {
                                        ...currentMsg,
                                        steps: updatedSteps
                                    };
                                    return last;
                                });
                                continue;
                            }

                            const delta = data.choices?.[0]?.delta;
                            const content = delta?.content || '';
                            const reasoning = delta?.reasoning_content || '';
                            const toolCalls = delta?.tool_calls; // 获取工具调用
                            const chunkId = data.id; // 获取 chunk 中的 ID
                            if (chunkId) finalRequestId = chunkId;

                            // 获取 Usage 统计信息
                            if (data.usage) {
                                usage = data.usage;
                            }
                            
                            const prevContentLength = fullContent.length;
                            fullContent += content;
                            fullReasoning += reasoning;
                            
                            // 逻辑：如果正文内容开始出现（从空变有），则自动折叠思考过程，并将所有工具调用标记为完成
                            const shouldCollapse = prevContentLength === 0 && fullContent.length > 0;

                            setMessages(prev => {
                                const last = [...prev];
                                const currentMsg = last[last.length - 1];
                                
                                // 正确合并流式 tool_calls
                                let updatedSteps = [...(currentMsg.steps || [])];
                                
                                if (toolCalls && Array.isArray(toolCalls)) {
                                    toolCalls.forEach((tc: any) => {
                                        const index = tc.index;
                                        // 查找是否已有该 index 的 step
                                        // 注意：我们假设 steps 数组的顺序对应 index，或者我们需要在 step 对象里存 index
                                        // 简单起见，我们查找对应 index 的 step，或者如果没有 index 属性，就假设是追加的
                                        
                                        // 更稳健的做法：在 step 里存储 index
                                        let stepIndex = updatedSteps.findIndex((s: any) => s.index === index);
                                        
                                        if (stepIndex !== -1) {
                                            // 更新现有 step
                                            const existingStep = updatedSteps[stepIndex];
                                            updatedSteps[stepIndex] = {
                                                ...existingStep,
                                                toolName: existingStep.toolName || tc.function?.name, // name 可能只在第一帧出现
                                                toolArgs: (existingStep.toolArgs || '') + (tc.function?.arguments || ''),
                                                status: 'running'
                                            };
                                        } else {
                                            // 新增 step
                                            updatedSteps.push({
                                                type: 'tool',
                                                index: index, // 记录 index 以便合并
                                                toolName: tc.function?.name,
                                                toolArgs: tc.function?.arguments || '',
                                                status: 'running'
                                            });
                                        }
                                    });
                                }

                                // 如果开始输出正文或思考内容，且没有新的 tool calls，说明上一轮工具调用结束
                                if ((content || reasoning) && !toolCalls) {
                                     updatedSteps = updatedSteps.map(s => s.status === 'running' ? { ...s, status: 'completed' } : s);
                                }
                                
                                last[last.length - 1] = {
                                    ...currentMsg,
                                    content: fullContent,
                                    reasoning: fullReasoning,
                                    reasoningCollapsed: shouldCollapse ? true : currentMsg.reasoningCollapsed,
                                    thinking: false,
                                    steps: updatedSteps,
                                    meta: {
                                        ...currentMsg.meta,
                                        requestId: finalRequestId || currentMsg.meta?.requestId,
                                        inputTokens: usage?.prompt_tokens,
                                        outputTokens: usage?.completion_tokens,
                                        totalTokens: usage?.total_tokens,
                                        tokens: usage?.total_tokens || Math.ceil((fullContent.length + fullReasoning.length) / 4)
                                    } as any
                                };
                                return last;
                            });
                        } catch (e) {
                        }
                    }
                }
            }
        }

        const endTime = Date.now();
        setMessages(prev => {
            const last = [...prev];
            const currentMsg = last[last.length - 1];
            last[last.length - 1] = {
                ...currentMsg,
                meta: {
                    ttft: `${ttft}ms`,
                    inputTokens: usage?.prompt_tokens,
                    outputTokens: usage?.completion_tokens,
                    totalTokens: usage?.total_tokens,
                    tokens: usage?.total_tokens || Math.ceil((fullContent.length + fullReasoning.length) / 4),
                    time: `${((endTime - startTime) / 1000).toFixed(1)}s`,
                    requestId: finalRequestId || currentMsg.meta?.requestId
                }
            };
            return last;
        });

    } catch (e: any) {
        console.error(e);
        message.error(e.message || "Failed to get response from AI");
        setMessages(prev => {
            const last = [...prev];
            last[last.length - 1] = {
                ...last[last.length - 1],
                content: e.message || '请求出错，请检查后台配置或网络连接。',
                thinking: false
            };
            return last;
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px-48px)] -m-8 overflow-hidden bg-[#101922]">
      {/* Left Sidebar - Configuration */}
      <div className="w-[320px] bg-[#111a22] border-r border-[#233648] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#233648] flex items-center gap-2">
          <SettingOutlined className="text-white" />
          <span className="text-white font-bold">模型设置</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Token & Model Selection */}
          <div className="space-y-4">
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>应用令牌 (App Token)</span>
                <Tooltip title="输入 appid_secret 格式的令牌以获取授权模型">
                  <InfoCircleOutlined className="text-slate-500 cursor-help" />
                </Tooltip>
              </div>
              <Space.Compact className="w-full">
                <Input.Password 
                  value={appToken}
                  onChange={(e) => setAppToken(e.target.value)}
                  placeholder="appid_secret"
                  className="bg-[#111a22] border-[#233648] text-white"
                />
                <Button 
                    type="primary" 
                    icon={<SyncOutlined spin={isLoading} />} 
                    onClick={() => fetchModelsByToken(appToken)}
                    title="加载模型"
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">选择模型</div>
              <Select 
                value={selectedModel}
                onChange={setSelectedModel}
                className="w-full"
                options={availableModels.map(m => ({ value: m, label: m }))}
                placeholder={availableModels.length > 0 ? "选择模型" : "请先输入令牌加载模型"}
                disabled={availableModels.length === 0}
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
                <span className="text-primary text-xs font-mono">{temperature}</span>
              </div>
              <Slider 
                min={0} max={2} step={0.1} 
                value={temperature} 
                onChange={setTemperature}
                tooltip={{ open: false }} className="m-0" 
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">Top P (核采样)</span>
                <span className="text-primary text-xs font-mono">{topP}</span>
              </div>
              <Slider 
                min={0} max={1} step={0.05} 
                value={topP} 
                onChange={setTopP}
                tooltip={{ open: false }} className="m-0" 
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-xs">Max Tokens (最大长度)</span>
                <span className="text-slate-400 bg-[#1a2632] px-1.5 rounded text-[10px] font-mono border border-[#334155]">{maxTokens}</span>
              </div>
              <Slider 
                min={1} max={8192} step={1}
                value={maxTokens}
                onChange={setMaxTokens}
                tooltip={{ open: false }} className="m-0" 
              />
            </div>

            <div className="h-px bg-[#233648] my-4"></div>

            {/* Custom JSON Params */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CodeOutlined className="text-primary text-xs" />
                  <span className="text-white font-bold text-xs uppercase tracking-wider">自定义参数 (JSON)</span>
                </div>
                <Button 
                  type="text" 
                  size="small" 
                  className="text-primary text-[10px] p-0 h-auto hover:bg-transparent"
                  onClick={formatJson}
                >
                  格式化
                </Button>
              </div>
              <TextArea
                value={customParams}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder='{ "key": "value" }'
                autoSize={{ minRows: 4, maxRows: 12 }}
                className={`bg-[#111a22] border-[#233648] text-white font-mono text-xs focus:border-primary/50 hover:border-primary/30 transition-colors ${!isJsonValid ? 'border-red-500 focus:border-red-500' : ''}`}
                style={{ padding: '8px' }}
              />
              {!isJsonValid && (
                <div className="text-red-500 text-[10px] flex items-center gap-1">
                  <CloseOutlined className="text-[10px]" />
                  <span>无效的 JSON 格式</span>
                </div>
              )}
            </div>
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
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            className="text-slate-400 hover:text-white"
            onClick={() => setMessages([])}
          >
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
                      <LoadingOutlined />
                      <span>正在思考中...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                        {/* 实时步骤显示 (工具调用等) */}
                        {msg.steps && msg.steps.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {msg.steps.map((step, sIdx) => (
                                    <div key={sIdx} className={`flex items-center gap-3 bg-[#111a22] px-3 py-2 rounded-lg border border-primary/20 ${step.status === 'running' ? 'animate-pulse' : ''}`}>
                                        <div className="bg-primary/20 p-1.5 rounded-md">
                                            <BuildOutlined className="text-primary text-xs" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">执行技能工具</span>
                                            <span className="text-xs text-primary font-mono">{step.displayName || step.toolName || 'Unknown Tool'}</span>
                                        </div>
                                        {step.status === 'running' ? (
                                            <LoadingOutlined className="ml-auto text-primary text-xs" />
                                        ) : (
                                            <CheckCircleFilled className="ml-auto text-green-500 text-xs" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {msg.reasoning && (
                            <div className="bg-[#111a22] border-l-2 border-primary/40 mb-3 rounded-r-lg overflow-hidden transition-all">
                                <div 
                                    className="bg-[#1a2632] px-3 py-1.5 flex justify-between items-center cursor-pointer hover:bg-[#233648] transition-colors"
                                    onClick={() => {
                                        setMessages(prev => {
                                            const next = [...prev];
                                            const idx = prev.findIndex(m => m === msg);
                                            if (idx !== -1) {
                                                next[idx] = { ...next[idx], reasoningCollapsed: !next[idx].reasoningCollapsed };
                                            }
                                            return next;
                                        });
                                    }}
                                >
                                    <div className="text-primary/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                        <ThunderboltFilled className="text-[10px]" />
                                        <span>Thinking Process</span>
                                    </div>
                                    <div className="text-slate-500 text-[10px] flex items-center gap-1">
                                        {msg.reasoningCollapsed ? '展开' : '折叠'}
                                    </div>
                                </div>
                                {!msg.reasoningCollapsed && (
                                    <div className="p-3 text-slate-400 font-mono text-xs italic animate-in fade-in slide-in-from-top-1 duration-200">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                code({ node, inline, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            }}
                                        >
                                            {msg.reasoning}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="markdown-content text-xs leading-relaxed overflow-x-auto">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-lg my-2"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className="bg-[#0d1117] px-1.5 py-0.5 rounded text-primary font-mono" {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-white border-b border-[#233648] pb-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mb-3 mt-5 first:mt-0 text-white">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-4 first:mt-0 text-white">{children}</h3>,
                                    ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-4 italic text-slate-400 bg-primary/5 rounded-r">{children}</blockquote>,
                                    table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-[#233648]">{children}</table></div>,
                                    th: ({ children }) => <th className="border border-[#233648] bg-[#1a2632] px-3 py-2 text-left font-bold text-white">{children}</th>,
                                    td: ({ children }) => <td className="border border-[#233648] px-3 py-2">{children}</td>,
                                    hr: () => <hr className="my-6 border-[#233648]" />,
                                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                  )}
                </div>

                {msg.meta && (
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 ml-1">
                    {msg.meta.requestId && (
                        <Tooltip title={`Request ID: ${msg.meta.requestId}`}>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50 cursor-help">
                                <LinkOutlined className="text-slate-400" />
                                <span>ID: <span className="text-slate-400 font-mono">{msg.meta.requestId.slice(0, 8)}...</span></span>
                            </div>
                        </Tooltip>
                    )}
                    
                    {msg.meta.ttft && msg.meta.ttft !== '-' && (
                        <Tooltip title="Time To First Token">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                                <ThunderboltFilled className="text-green-500" />
                                <span>TTFT: <span className="text-green-400 font-mono">{msg.meta.ttft}</span></span>
                            </div>
                        </Tooltip>
                    )}

                    {msg.meta.inputTokens !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                            <span className="text-slate-400">Input:</span>
                            <span className="text-blue-400 font-mono">{msg.meta.inputTokens}</span>
                        </div>
                    )}
                    
                    {msg.meta.outputTokens !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                            <span className="text-slate-400">Output:</span>
                            <span className="text-green-400 font-mono">{msg.meta.outputTokens}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                      <DatabaseOutlined className="text-slate-400" />
                      <span>Tokens: <span className="text-green-400 font-mono">{msg.meta.tokens}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-[#1a2632]/50 px-2 py-0.5 rounded border border-[#233648]/50">
                      <ClockCircleOutlined className="text-slate-400" />
                      <span>耗时: <span className="text-green-400 font-mono">{msg.meta.time}</span></span>
                    </div>
                  </div>
                )}
                
                {msg.time && msg.role === 'user' && (
                  <span className="text-slate-500 text-[10px] mt-1 mr-1">{msg.time}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0 mt-auto">
          <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden shadow-xl shadow-black/20 focus-within:border-primary/50 transition-colors">
            <TextArea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPressEnter={(e) => {
                if (e.shiftKey) return;
                e.preventDefault();
                handleSendMessage();
              }}
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
                <span className="text-[10px] text-slate-500 hidden sm:inline-block">使用 Enter 发送</span>
                <Button 
                  type="primary" 
                  icon={isLoading ? <LoadingOutlined /> : <SendOutlined />} 
                  className="bg-primary hover:bg-blue-600 border-none shadow-lg shadow-blue-900/20"
                  onClick={handleSendMessage}
                  disabled={isLoading}
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
