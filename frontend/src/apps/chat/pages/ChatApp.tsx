import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Input,
  Tooltip,
  ConfigProvider,
  theme,
  message,
  Drawer,
  List,
  Avatar,
  Space,
  Select,
  Slider,
  Typography,
  Modal,
  Switch,
  Upload,
  Image as AntdImage
} from 'antd';
import { 
  SendOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  RobotOutlined,
  SettingOutlined,
  MenuOutlined,
  PlusOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  CodeOutlined,
  ThunderboltFilled,
  ClockCircleOutlined,
  DatabaseOutlined,
  BuildOutlined,
  LoadingOutlined,
  LinkOutlined,
  CheckCircleFilled,
  FileWordOutlined,
  FilePdfOutlined,
  EditOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { Document, Packer, Paragraph as DocxParagraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ChatMessage, ChatCompletionRequest } from '../services/chatApi';
import { chatCompletionsStream, getModels, getChatHistory, saveChat, deleteChat } from '../services/chatApi';
import './ChatApp.css';

const { TextArea } = Input;
const { Text } = Typography;

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

interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface ModelSettings {
  appToken: string;
  selectedModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  customParams: string;
  availableModels: string[];
}

const ChatApp: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>(localStorage.getItem('chat_token') || 'demo-token');
  const [prompt, setPrompt] = useState('');
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Model Settings
  const [settings, setSettings] = useState<ModelSettings>({
    appToken: localStorage.getItem('chat_app_token') || '',
    selectedModel: localStorage.getItem('chat_selected_model') || '',
    temperature: parseFloat(localStorage.getItem('chat_temperature') || '0.7'),
    topP: parseFloat(localStorage.getItem('chat_top_p') || '1.0'),
    maxTokens: parseInt(localStorage.getItem('chat_max_tokens') || '4096'),
    customParams: localStorage.getItem('chat_custom_params') || '{\n  "frequency_penalty": 0,\n  "presence_penalty": 0\n}',
    availableModels: []
  });
  
  const [isJsonValid, setIsJsonValid] = useState(true);

  // 暂时移除登录验证，方便查看样式
  // useEffect(() => {
  //   if (!token) {
  //     navigate('/chat/login');
  //   }
  // }, [token, navigate]);

  // 加载模型列表
  useEffect(() => {
    if (token && settings.appToken) {
      loadModels();
    }
  }, [token]);

  // 加载历史对话
  useEffect(() => {
    if (token) {
      loadChatHistory();
    }
  }, [token]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadModels = async () => {
    try {
      const res = await getModels(settings.appToken);
      if (res.code === 200 && Array.isArray(res.data)) {
        const modelList = res.data.map((m: any) => m.id);
        setSettings(prev => ({ ...prev, availableModels: modelList }));
        if (modelList.length > 0 && !modelList.includes(settings.selectedModel)) {
          setSettings(prev => ({ ...prev, selectedModel: modelList[0] }));
          localStorage.setItem('chat_selected_model', modelList[0]);
        }
        localStorage.setItem('chat_available_models', JSON.stringify(modelList));
      }
    } catch (e: any) {
      console.error('加载模型失败', e);
    }
  };

  const loadChatHistory = async () => {
    try {
      const res = await getChatHistory(token);
      if (res.code === 200) {
        setChatHistory(res.data || []);
      }
    } catch (e: any) {
      console.error('加载历史对话失败', e);
    }
  };

  const exportToWord = async (content: string) => {
    try {
      const lines = content.split('\n');
      const children = [];
      let inCodeBlock = false;

      const processText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({
              text: part.slice(2, -2),
              bold: true,
            });
          }
          return new TextRun({ text: part });
        });
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock) {
          children.push(new DocxParagraph({
            children: [new TextRun({
              text: line,
              font: "Courier New",
            })],
          }));
          continue;
        }

        if (line.startsWith('# ')) {
          children.push(new DocxParagraph({
            text: line.replace('# ', ''),
            heading: HeadingLevel.HEADING_1,
          }));
        } else if (line.startsWith('## ')) {
          children.push(new DocxParagraph({
            text: line.replace('## ', ''),
            heading: HeadingLevel.HEADING_2,
          }));
        } else if (line.startsWith('### ')) {
          children.push(new DocxParagraph({
            text: line.replace('### ', ''),
            heading: HeadingLevel.HEADING_3,
          }));
        } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const cleanLine = line.trim().replace(/^[\-\*]\s+/, '');
          children.push(new DocxParagraph({
            children: processText(cleanLine),
            bullet: { level: 0 }
          }));
        } else if (/^\d+\.\s/.test(line.trim())) {
          const cleanLine = line.trim().replace(/^\d+\.\s+/, '');
          children.push(new DocxParagraph({
            children: processText(cleanLine),
            bullet: { level: 0 }
          }));
        } else if (line.trim() !== '') {
          children.push(new DocxParagraph({
            children: processText(line),
            spacing: { after: 200 }
          }));
        } else {
          children.push(new DocxParagraph({ text: "" }));
        }
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `AI_Content_${new Date().getTime()}.docx`);
      message.success('Word 文档生成成功');
    } catch (err) {
      console.error(err);
      message.error('生成 Word 文档失败');
    }
  };

  const exportToPDF = async (index: number) => {
    try {
      const element = document.getElementById(`msg-content-${index}`);
      if (!element) return;

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = '794px';
      clone.style.padding = '20px';
      clone.style.background = '#ffffff';
      clone.style.color = '#000000';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.left = '0';
      container.style.zIndex = '-100';
      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 800
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`AI_Content_${new Date().getTime()}.pdf`);
        message.success('PDF 文档生成成功');
      } finally {
        document.body.removeChild(container);
      }
    } catch (err) {
      console.error(err);
      message.error('生成 PDF 文档失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        message.warning(`${file.name} 不是有效的图片文件`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setUploadedImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendMessage = async () => {
    if ((!prompt.trim() && uploadedImages.length === 0) || isLoading || !settings.selectedModel) {
      if (!settings.selectedModel) {
        message.warning('请先在设置中选择模型');
      }
      return;
    }
    
    // Construct content for user message
    let userContent: string | any[] = prompt;
    if (uploadedImages.length > 0) {
      userContent = [
        { type: 'text', text: prompt || '分析这张图片' },
        ...uploadedImages.map(img => ({
          type: 'image_url',
          image_url: { url: img }
        }))
      ];
    }

    const userMsg: ExtendedChatMessage = {
      role: 'user',
      content: userContent,
      time: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setUploadedImages([]); // Clear images after sending
    setIsLoading(true);

    const assistantMsg: ExtendedChatMessage = {
      role: 'assistant',
      model: settings.selectedModel,
      content: '',
      thinking: true
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const startTime = Date.now();
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      
      const payloadMessages: ChatMessage[] = [];
      if (systemPrompt) payloadMessages.push({ role: 'system', content: systemPrompt });
      payloadMessages.push(...chatHistory, { role: 'user', content: userContent });

      let extraParams = {};
      try {
        if (settings.customParams.trim()) {
          extraParams = JSON.parse(settings.customParams);
        }
      } catch (e) {
        console.error("Invalid custom params JSON", e);
      }

      const response = await chatCompletionsStream({
        model: settings.selectedModel,
        messages: payloadMessages,
        temperature: settings.temperature,
        top_p: settings.topP,
        ...(settings.maxTokens > 0 ? { max_tokens: settings.maxTokens } : {}),
        stream: true,
        ...extraParams
      } as ChatCompletionRequest, token);

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
                
                // 处理自定义工具信息事件 (x_tool_info)
                if (data.type === 'x_tool_info' && data.info) {
                  setMessages(prev => {
                    const last = [...prev];
                    const currentMsg = last[last.length - 1];
                    let updatedSteps = [...(currentMsg.steps || [])];
                    
                    Object.entries(data.info as Record<string, string>).forEach(([toolName, displayName]) => {
                      updatedSteps = updatedSteps.map(step => {
                        if (step.type === 'tool' && step.toolName === toolName) {
                          return { ...step, displayName: displayName };
                        }
                        return step;
                      });
                    });
                    
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
                const toolCalls = delta?.tool_calls;
                const chunkId = data.id;
                if (chunkId) finalRequestId = chunkId;

                if (data.usage) {
                  usage = data.usage;
                }
                
                const prevContentLength = fullContent.length;
                fullContent += content;
                fullReasoning += reasoning;
                
                const shouldCollapse = prevContentLength === 0 && fullContent.length > 0;

                setMessages(prev => {
                  const last = [...prev];
                  const currentMsg = last[last.length - 1];
                  
                  let updatedSteps = [...(currentMsg.steps || [])];
                  
                  if (toolCalls && Array.isArray(toolCalls)) {
                    toolCalls.forEach((tc: any) => {
                      const index = tc.index;
                      let stepIndex = -1;
                      for (let i = updatedSteps.length - 1; i >= 0; i--) {
                        if (updatedSteps[i].index === index && updatedSteps[i].status !== 'completed') {
                          stepIndex = i;
                          break;
                        }
                      }
                      
                      if (stepIndex !== -1) {
                        const existingStep = updatedSteps[stepIndex];
                        updatedSteps[stepIndex] = {
                          ...existingStep,
                          toolName: tc.function?.name || existingStep.toolName,
                          toolArgs: (existingStep.toolArgs || '') + (tc.function?.arguments || ''),
                          status: 'running'
                        };
                      } else {
                        updatedSteps.push({
                          type: 'tool',
                          index: index,
                          toolName: tc.function?.name,
                          toolArgs: tc.function?.arguments || '',
                          status: 'running'
                        });
                      }
                    });
                  }

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
                // Parse error, continue
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

      // 保存对话
      if (messages.length === 0) {
        // 新对话，使用第一条用户消息作为标题
        try {
          const title = prompt.slice(0, 30);
          await saveChat(title, [...messages, userMsg, { ...assistantMsg, content: fullContent }], token);
          await loadChatHistory();
        } catch (e) {
          console.error('保存对话失败', e);
        }
      } else if (currentChatId) {
        // 更新现有对话
        try {
          await saveChat(chatHistory.find(h => h.id === currentChatId)?.title || '对话', [...messages, userMsg, { ...assistantMsg, content: fullContent }], token);
        } catch (e) {
          console.error('更新对话失败', e);
        }
      }

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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setIsHistoryOpen(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId, token);
      message.success('删除成功');
      await loadChatHistory();
      if (currentChatId === chatId) {
        handleNewChat();
      }
    } catch (e: any) {
      message.error('删除失败');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('chat_app_token', settings.appToken);
    localStorage.setItem('chat_selected_model', settings.selectedModel);
    localStorage.setItem('chat_temperature', settings.temperature.toString());
    localStorage.setItem('chat_top_p', settings.topP.toString());
    localStorage.setItem('chat_max_tokens', settings.maxTokens.toString());
    localStorage.setItem('chat_custom_params', settings.customParams);
    localStorage.setItem('chat_available_models', JSON.stringify(settings.availableModels));
    message.success('设置已保存');
    setIsSettingsOpen(false);
    if (settings.appToken) {
      loadModels();
    }
  };

  const handleJsonChange = (value: string) => {
    setSettings(prev => ({ ...prev, customParams: value }));
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
      const parsed = JSON.parse(settings.customParams);
      setSettings(prev => ({ ...prev, customParams: JSON.stringify(parsed, null, 2) }));
      setIsJsonValid(true);
    } catch (e) {
      message.error("JSON 格式错误，无法格式化");
    }
  };

  // 设置 body 和 root 样式，确保完全独立于 MainLayout
  useEffect(() => {
    const body = document.body;
    const root = document.getElementById('root');
    
    // 添加类名和样式
    body.classList.add('chat-app-page');
    if (root) {
      root.style.height = '100vh';
      root.style.width = '100vw';
      root.style.margin = '0';
      root.style.padding = '0';
    }
    
    return () => {
      body.classList.remove('chat-app-page');
      if (root) {
        root.style.height = '';
        root.style.width = '';
        root.style.margin = '';
        root.style.padding = '';
      }
    };
  }, []);

  // 暂时移除登录验证
  // if (!token) {
  //   return null;
  // }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#137fec',
          colorBgContainer: '#1a2632',
          colorBgBase: '#101922',
          colorBorder: '#233648',
          colorText: '#e2e8f0',
          colorBgElevated: '#1a2632',
          borderRadiusLG: 12,
        },
        components: {
          Modal: {
            headerBg: '#1a2632',
            contentBg: '#1a2632',
            titleColor: 'white',
            colorBgMask: 'rgba(0, 0, 0, 0.6)',
          },
          Drawer: {
            headerBg: '#1a2632',
            bodyBg: '#1a2632',
            titleColor: 'white',
            colorBgMask: 'rgba(0, 0, 0, 0.6)',
          },
          Input: {
            colorBgContainer: '#111a22',
            colorBorder: '#233648',
            hoverBorderColor: '#137fec',
            activeBorderColor: '#137fec',
            colorText: '#e2e8f0',
            colorTextPlaceholder: '#64748b',
          },
          Select: {
            colorBgContainer: '#111a22',
            colorBorder: '#233648',
            colorText: '#e2e8f0',
          },
        },
      }}
    >
      <div className="chat-app-container">
        {/* Header */}
        <header className="chat-app-header">
          <div className="chat-app-header-left">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setIsHistoryOpen(true)}
              className="chat-header-btn"
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleNewChat}
              className="chat-header-btn"
            >
              新对话
            </Button>
          </div>
          <div className="chat-app-header-center">
            <h1 className="chat-app-title">AI 对话助手</h1>
            <Tooltip title="设置 System Prompt">
              <Button 
                type="text" 
                icon={<BuildOutlined />} 
                className="chat-header-btn"
                onClick={() => setIsSystemModalOpen(true)}
              >
                系统提示词
              </Button>
            </Tooltip>
          </div>
          <div className="chat-app-header-right">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => setMessages([])}
              className="chat-header-btn"
            >
              清除历史
            </Button>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setIsSettingsOpen(true)}
              className="chat-header-btn"
            />
          </div>
        </header>

        {/* Main Content */}
        <div className="chat-app-content">
          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <RobotOutlined style={{ fontSize: 64, color: '#666', marginBottom: 16 }} />
                <p>开始新的对话</p>
              </div>
            )}
            
            {systemPrompt && (
              <div className="flex justify-center mb-4">
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
                              <div className="p-3 text-slate-400 font-mono text-xs italic">
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

                        {/* User content with images support */}
                        {msg.role === 'user' && Array.isArray(msg.content) ? (
                          <div className="space-y-3">
                            <div className="text-white">{msg.content.find((c: any) => c.type === 'text')?.text}</div>
                            <div className="flex flex-wrap gap-2">
                              {msg.content.filter((c: any) => c.type === 'image_url').map((img: any, iIdx: number) => (
                                <AntdImage 
                                  key={iIdx} 
                                  src={img.image_url.url} 
                                  width={100} 
                                  className="rounded-lg border border-white/20"
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div id={`msg-content-${idx}`} className="markdown-content text-xs leading-relaxed overflow-x-auto">
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
                              {typeof msg.content === 'string' ? msg.content : ''}
                            </ReactMarkdown>
                          </div>
                        )}
                        
                        {/* Export Buttons in Writing Mode */}
                        {msg.role === 'assistant' && isWritingMode && msg.content && !msg.thinking && (
                          <div className="flex gap-2 mt-4 pt-3 border-t border-[#233648]/50">
                            <Button 
                              size="small" 
                              icon={<FileWordOutlined />} 
                              onClick={() => exportToWord(msg.content as string)}
                              className="bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30"
                            >
                              导出 Word
                            </Button>
                            <Button 
                              size="small" 
                              icon={<FilePdfOutlined />} 
                              onClick={() => exportToPDF(idx)}
                              className="bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30"
                            >
                              导出 PDF
                            </Button>
                          </div>
                        )}
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
          <div className="chat-input-area">
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#1a2632] border border-[#233648] rounded-lg">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <AntdImage 
                      src={img} 
                      width={60} 
                      height={60} 
                      className="rounded object-cover border border-white/10"
                    />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full size-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                disabled={isLoading}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
                multiple 
              />
              <div className="flex justify-between items-center px-3 py-2 bg-[#1a2632] border-t border-[#233648]/50">
                <div className="flex gap-2 items-center">
                  <Button 
                    type="text" 
                    icon={<PictureOutlined />} 
                    className="text-slate-400 hover:text-white text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    图片
                  </Button>
                  <div className="w-px h-4 bg-[#233648] mx-1"></div>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setIsWritingMode(!isWritingMode)}>
                    <EditOutlined className={isWritingMode ? 'text-primary' : 'text-slate-500'} />
                    <span className={`text-[11px] font-medium ${isWritingMode ? 'text-white' : 'text-slate-500'}`}>写作模式</span>
                    <Switch 
                      size="small"
                      checked={isWritingMode} 
                      onChange={setIsWritingMode} 
                      className={isWritingMode ? 'bg-primary' : 'bg-slate-700'}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 hidden sm:inline-block">使用 Enter 发送</span>
                  <Button 
                    type="primary" 
                    icon={isLoading ? <LoadingOutlined /> : <SendOutlined />} 
                    className="bg-primary hover:bg-blue-600 border-none shadow-lg shadow-blue-900/20"
                    onClick={handleSendMessage}
                    disabled={isLoading || (!prompt.trim() && uploadedImages.length === 0) || !settings.selectedModel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Drawer */}
        <Drawer
          title="对话历史"
          placement="left"
          onClose={() => setIsHistoryOpen(false)}
          open={isHistoryOpen}
          width={300}
          getContainer={document.body}
          styles={{
            body: { backgroundColor: '#1a2632', color: '#e2e8f0' },
            header: { backgroundColor: '#1a2632', borderBottom: '1px solid #233648' },
          }}
        >
          <List
            dataSource={chatHistory}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => handleDeleteChat(item.id)}
                  >
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={`${item.messageCount} 条消息 · ${new Date(item.updatedAt).toLocaleString()}`}
                />
              </List.Item>
            )}
          />
        </Drawer>

        {/* Settings Drawer */}
        <Drawer
          title="模型设置"
          placement="right"
          onClose={() => setIsSettingsOpen(false)}
          open={isSettingsOpen}
          width={400}
          getContainer={document.body}
          styles={{
            body: { backgroundColor: '#1a2632', color: '#e2e8f0' },
            header: { backgroundColor: '#1a2632', borderBottom: '1px solid #233648' },
          }}
        >
          <div className="chat-settings">
            <div className="chat-setting-item">
              <div className="chat-setting-label">
                <span>应用令牌 (App Token)</span>
                <Tooltip title="输入 appid_secret 格式的令牌以获取授权模型">
                  <InfoCircleOutlined className="chat-setting-help" />
                </Tooltip>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input.Password
                  value={settings.appToken}
                  onChange={(e) => setSettings(prev => ({ ...prev, appToken: e.target.value }))}
                  placeholder="appid_secret"
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={isLoading} />}
                  onClick={() => loadModels()}
                >
                  加载
                </Button>
              </div>
            </div>

            <div className="chat-setting-item">
              <div className="chat-setting-label">选择模型</div>
              <Select
                value={settings.selectedModel}
                onChange={(value) => setSettings(prev => ({ ...prev, selectedModel: value }))}
                className="w-full"
                options={settings.availableModels.map(m => ({ value: m, label: m }))}
                placeholder="请先输入令牌加载模型"
                disabled={settings.availableModels.length === 0}
              />
            </div>

            <div className="chat-setting-item">
              <div className="chat-setting-label">
                Temperature: {settings.temperature}
              </div>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onChange={(value) => setSettings(prev => ({ ...prev, temperature: value }))}
              />
            </div>

            <div className="chat-setting-item">
              <div className="chat-setting-label">
                Top P: {settings.topP}
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={settings.topP}
                onChange={(value) => setSettings(prev => ({ ...prev, topP: value }))}
              />
            </div>

            <div className="chat-setting-item">
              <div className="chat-setting-label">
                Max Tokens: {settings.maxTokens === 0 ? '不限制' : settings.maxTokens}
              </div>
              <Slider
                min={0}
                max={100000}
                step={1}
                value={settings.maxTokens}
                onChange={(value) => setSettings(prev => ({ ...prev, maxTokens: value }))}
              />
            </div>

            <div className="chat-setting-item">
              <div className="chat-setting-label">
                <span>自定义参数 (JSON)</span>
                <Button
                  type="link"
                  size="small"
                  onClick={formatJson}
                >
                  格式化
                </Button>
              </div>
              <TextArea
                value={settings.customParams}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder='{ "key": "value" }'
                autoSize={{ minRows: 4, maxRows: 8 }}
                className={!isJsonValid ? 'error' : ''}
              />
              {!isJsonValid && (
                <Text type="danger" style={{ fontSize: '12px' }}>无效的 JSON 格式</Text>
              )}
            </div>

            <Button type="primary" block onClick={handleSaveSettings} style={{ marginTop: 16 }}>
              保存设置
            </Button>
          </div>
        </Drawer>

        {/* System Prompt Modal */}
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
          getContainer={document.body}
          styles={{
            mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000 },
            content: { backgroundColor: '#1a2632', border: '1px solid #233648', zIndex: 1001 },
            header: { backgroundColor: '#1a2632', borderBottom: '1px solid #233648' },
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
      </div>
    </ConfigProvider>
  );
};

export default ChatApp;
