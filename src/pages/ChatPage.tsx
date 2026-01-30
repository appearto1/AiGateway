import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Button, 
  Input, 
  ConfigProvider, 
  theme, 
  Typography, 
  Avatar, 
  Dropdown, 
  message,
  Tooltip,
  Switch,
  Modal,
  Form
} from 'antd';
import type { MenuProps } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  UserOutlined, 
  SendOutlined, 
  LoadingOutlined, 
  DeleteOutlined, 
  MoreOutlined, 
  RobotOutlined, 
  SettingOutlined, 
  EditOutlined, 
  PictureOutlined, 
  CloseOutlined, 
  BuildOutlined, 
  CheckCircleFilled, 
  ThunderboltFilled, 
  ClockCircleOutlined, 
  DatabaseOutlined, 
  LinkOutlined, 
  FileWordOutlined, 
  FilePdfOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  KeyOutlined,
  LockOutlined,
  PaperClipOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    themeVariables: {
        background: 'transparent',
        fontSize: '24px',
        primaryColor: '#4a9eff',
        primaryTextColor: '#fff',
        primaryBorderColor: '#2563eb',
        secondaryColor: '#34d399',
        secondaryTextColor: '#fff',
        secondaryBorderColor: '#059669',
        tertiaryColor: '#fbbf24',
        tertiaryTextColor: '#1f2937',
        tertiaryBorderColor: '#d97706',
        lineColor: '#64748b',
        mainBkg: '#4a9eff',
        secondBkg: '#34d399',
        tertiaryBkg: '#fbbf24',
        nodeBorder: '#334155',
        clusterBkg: 'transparent',
        titleColor: '#1e293b',
        edgeLabelBackground: '#1a2632', // 改为深色，避免出现白色方块
        nodeTextColor: '#1e293b',
        clusterBorder: '#94a3b8',
        defaultLinkColor: '#64748b',
        actorBkg: '#4a9eff',
        actorBorder: '#2563eb',
        actorTextColor: '#fff',
        actorLineColor: '#64748b',
        signalColor: '#1e293b',
        signalTextColor: '#1e293b',
        labelBoxBkgColor: '#34d399',
        labelBoxBorderColor: '#059669',
        labelTextColor: '#1e293b',
        loopTextColor: '#1e293b',
        noteBorderColor: '#fbbf24',
        noteBkgColor: '#fef3c7',
        noteTextColor: '#1e293b',
        activationBorderColor: '#4a9eff',
        activationBkgColor: '#dbeafe',
        sequenceNumberColor: '#fff',
    }
});
import { getOpenAIModels, chatCompletionsStreamAssistant, getChatHistory, getChatMessages, saveChatMessage, createChatSession, deleteChatSession, getChatModels, uploadChatFile, getCurrentUserMenus, API_ORIGIN } from '../services/api';
import type { ChatMessage, ChatCompletionRequest, ChatSession as ApiChatSession, ChatFileItem } from '../services/api';
import { getStoredUser, removeToken, changePassword } from '../services/auth';
import avatarImg from '../assets/avatar.webp';
import { Document, Packer, Paragraph as DocxParagraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

// Reusing types from ModelPlayground
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

interface ChatSession {
  id: string;
  title: string;
  time: string;
  messages: ExtendedChatMessage[];
  selectedModelId?: string; // 当前会话选中的模型，切换模型只更新此字段，不触碰 messages
}

let mermaidIdCounter = 0;
const MermaidDiagram: React.FC<{ children: string }> = ({ children: code }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!code?.trim()) return;
    setError(null);
    setSvg('');
    const id = `mermaid-${++mermaidIdCounter}-${Date.now()}`;
    
    // 1. 方向：用户写 TD/TB/BT 时保留树形，仅未写方向时默认 LR
    let codeLR = code.trim();
    const hasTD = /^(flowchart|graph)\s*(TD|TB|BT|top\s*down)\s/i.test(codeLR);
    if (hasTD) {
      // 树形流程图：保持 TD/TB/BT，不改成 LR
    } else if (/^(flowchart|graph)\s*$/im.test(codeLR.split('\n')[0] || '')) {
      codeLR = codeLR.replace(/^(flowchart|graph)\s*/i, 'flowchart LR\n');
    }

    // 定义后处理函数 (上色、统一尺寸、缩放)
    const processSvg = (s: string, scale: number) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(s, 'image/svg+xml');
        // ... (原有的后处理逻辑: 颜色、rect统一高度、viewBox解析与设置width/height) ...
        // 为了复用代码，这里需要把原 useEffect 里的长逻辑搬进来
        // 但由于 StrReplace 很难精准匹配大段代码移动，我直接在这里重写 processSvg 逻辑
        
        // 1. 上色
        const colors = [
          { fill: '#4a9eff', stroke: '#2563eb' },
          { fill: '#34d399', stroke: '#059669' },
          { fill: '#fbbf24', stroke: '#d97706', textFill: '#1f2937' },
        ] as const;
        
        let nodeList = Array.from(doc.querySelectorAll('g.node'));
        if (nodeList.length === 0) {
            doc.querySelectorAll('svg g').forEach((g) => {
              if (g.querySelector(':scope > rect') || g.querySelector(':scope > polygon')) nodeList.push(g);
            });
        }
        nodeList.forEach((g, i) => {
            const c = colors[i % 3];
            const shape = g.querySelector('rect') || g.querySelector('polygon');
            if (shape) {
              shape.setAttribute('fill', c.fill);
              shape.setAttribute('stroke', c.stroke);
              const style = shape.getAttribute('style') || '';
              const rest = style.replace(/\b(fill|stroke)\s*:[^;]+;?/gi, '').trim();
              shape.setAttribute('style', `${rest}; fill: ${c.fill} !important; stroke: ${c.stroke} !important;`.trim());
            }
            if ('textFill' in c) {
              g.querySelectorAll('text').forEach((text) => {
                text.setAttribute('fill', c.textFill);
                const style = text.getAttribute('style') || '';
                const rest = style.replace(/\bfill\s*:[^;]+;?/gi, '').trim();
                text.setAttribute('style', `${rest}; fill: ${c.textFill} !important;`.trim());
              });
            }
        });

        // 2. 统一矩形高度 (min 60)
        const rects: Element[] = [];
        nodeList.forEach((g) => {
            const rect = g.querySelector('rect');
            const polygon = g.querySelector('polygon');
            if (rect && !polygon) rects.push(rect);
        });
        if (rects.length > 0) {
            let maxH = 0;
            rects.forEach((r) => {
              const h = parseFloat(r.getAttribute('height') || '0');
              if (h > maxH) maxH = h;
            });
            const finalH = Math.max(maxH, 60);
            rects.forEach((r) => {
              const h = parseFloat(r.getAttribute('height') || '0');
              const y = parseFloat(r.getAttribute('y') || '0');
              r.setAttribute('y', String(y - (finalH - h) / 2));
              r.setAttribute('height', String(finalH));
            });
        }

        // 3. 设置 viewBox 尺寸
        const rootSvg = doc.querySelector('svg');
        let width = 0;
        if (rootSvg) {
            const viewBox = rootSvg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/).filter(p => p.trim() !== '');
                if (parts.length === 4) {
                    const w = parseFloat(parts[2]);
                    const h = parseFloat(parts[3]);
                    width = w * scale;
                    rootSvg.setAttribute('width', width + 'px');
                    rootSvg.setAttribute('height', (h * scale) + 'px');
                }
            }
            rootSvg.style.maxWidth = 'none';
            rootSvg.style.height = 'auto';
        }
        const serializer = new XMLSerializer();
        return { svg: serializer.serializeToString(doc), width };
    };

    // 渲染逻辑: TD/TB/BT 直接渲染；仅 LR 时若太宽再转 TD
    mermaid.render(id, codeLR)
      .then(({ svg: s }) => {
        if (!s?.trim()) { setError('Mermaid 返回空内容'); return; }
        
        try {
            const processed = processSvg(s, 0.5);
            // 树形(TD/TB/BT)直接使用；仅当是 LR 且宽度>1000 时才改用 TD 重绘
            if (!hasTD && processed.width > 1000) {
                let codeTD = codeLR.replace(/flowchart LR/i, 'flowchart TD');
                const idTD = id + '-td';
                mermaid.render(idTD, codeTD).then(({ svg: sTD }) => {
                    setSvg(processSvg(sTD, 0.5).svg);
                }).catch(() => setSvg(processed.svg));
            } else {
                setSvg(processed.svg);
            }
        } catch {
            setSvg(s);
        }
      })
      .catch((e: Error) => setError(e?.message || String(e)));
  }, [code]);
  if (error) return <pre className="rounded-lg my-2 p-4 bg-[#0d1117] text-slate-300 text-xs overflow-x-auto">{code}</pre>;
  if (svg) return (
    <div className="my-4 w-full max-w-full overflow-x-auto custom-scrollbar pb-2 bg-transparent [&_svg]:block [&_svg]:mx-auto [&_svg]:bg-transparent [&_svg_.cluster]:!fill-transparent [&_svg_.cluster]:!stroke-[#94a3b8]" style={{ background: 'transparent' }} dangerouslySetInnerHTML={{ __html: svg }} />
  );
  return <div className="my-4 flex justify-center text-slate-500 text-xs animate-pulse">渲染中...</div>;
};

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Array<{ label: string; value: string }>>([]);
  const [appToken, setAppToken] = useState<string>(localStorage.getItem('playground_app_token') || '');
  
    const [user] = useState(getStoredUser());
  const [hasAdminMenus, setHasAdminMenus] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm] = Form.useForm();
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [isWritingMode, setIsWritingMode] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<ChatFileItem[]>([]);
    const [exportLoading, setExportLoading] = useState<{ type: 'word' | 'pdf'; index: number } | null>(null);

    // Refs
    const chatEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const autoCreateSessionDoneRef = useRef(false); // 防止 StrictMode 下 effect 执行两次导致创建 2 条会话

    const svgToPngArrayBuffer = (svg: string): Promise<{ buffer: ArrayBuffer; width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string | undefined;
                if (!dataUrl) {
                    reject(new Error('FileReader failed'));
                    return;
                }
                img.onload = () => {
                    const scale = 3;
                    const maxW = 2400;
                    const maxH = 1800;
                    const w = Math.min(Math.round(img.naturalWidth * scale), maxW);
                    const h = Math.min(Math.round(img.naturalHeight * scale), maxH);
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('No canvas context')); return; }
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        if (!blob) { reject(new Error('toBlob failed')); return; }
                        blob.arrayBuffer().then((buffer) => resolve({ buffer, width: w, height: h })).catch(reject);
                    }, 'image/png');
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = dataUrl;
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(svgBlob);
        });
    };

    const exportToWord = async (content: string, index: number) => {
        setExportLoading({ type: 'word', index });
        try {
            const lines = content.split('\n');
            const children: any[] = [];
            let inCodeBlock = false;
            const processText = (text: string) => {
                const parts = text.split(/(\*\*.*?\*\*)/g);
                return parts.map((part: string) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return new TextRun({ text: part.slice(2, -2), bold: true });
                    }
                    return new TextRun({ text: part });
                });
            };
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith('```')) {
                    const lang = line.trim().slice(3).trim().toLowerCase();
                    if (lang === 'mermaid') {
                        let j = i + 1;
                        while (j < lines.length && lines[j].trim() !== '```') j++;
                        const mermaidCode = lines.slice(i + 1, j).join('\n').trim();
                        i = j;
                        if (mermaidCode) {
                            try {
                                const { svg } = await mermaid.render('wm-' + Date.now() + '-' + i, mermaidCode);
                                const { buffer, width, height } = await svgToPngArrayBuffer(svg);
                                const maxDisplayW = 480;
                                const displayW = Math.min(width, maxDisplayW);
                                const displayH = Math.round((height / width) * displayW);
                                children.push(new DocxParagraph({
                                    children: [new ImageRun({
                                        type: 'png',
                                        data: buffer,
                                        transformation: { width: displayW, height: displayH }
                                    })]
                                }));
                            } catch (_) {
                                children.push(new DocxParagraph({ children: [new TextRun({ text: mermaidCode, font: 'Courier New' })] }));
                            }
                        }
                        continue;
                    }
                    inCodeBlock = !inCodeBlock;
                    continue;
                }
                if (inCodeBlock) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line, font: 'Courier New' })] }));
                    continue;
                }
                if (line.startsWith('# ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('# ', '') })], heading: HeadingLevel.HEADING_1 }));
                } else if (line.startsWith('## ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('## ', '') })], heading: HeadingLevel.HEADING_2 }));
                } else if (line.startsWith('### ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('### ', '') })], heading: HeadingLevel.HEADING_3 }));
                } else if (line.startsWith('#### ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('#### ', '') })], heading: HeadingLevel.HEADING_4 }));
                } else if (line.startsWith('##### ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('##### ', '') })], heading: HeadingLevel.HEADING_5 }));
                } else if (line.startsWith('###### ')) {
                    children.push(new DocxParagraph({ children: [new TextRun({ text: line.replace('###### ', '') })], heading: HeadingLevel.HEADING_6 }));
                } else if (/^\|.+\|$/.test(line.trim())) {
                    const tableRows: string[][] = [];
                    let j = i;
                    while (j < lines.length && /^\|.+\|$/.test(lines[j].trim())) {
                        const cells = lines[j].trim().split('|').map((c: string) => c.trim()).filter((c: string) => c !== '');
                        if (cells.length > 0) tableRows.push(cells);
                        j++;
                    }
                    i = j - 1;
                    if (tableRows.length >= 1) {
                        const isSeparator = (row: string[]) => row.every((c: string) => /^[\s\-:]+$/.test(c));
                        const dataRows = tableRows.filter((row: string[]) => !isSeparator(row));
                        const docxRows = dataRows.map((row: string[], rowIdx: number) => {
                            const isHeader = rowIdx === 0 && tableRows.length > 1 && isSeparator(tableRows[1]);
                            const cells = row.map((cell: string) => new TableCell({
                                children: [new DocxParagraph({ children: [new TextRun({ text: cell, bold: isHeader })] })]
                            }));
                            return new TableRow({ children: cells });
                        });
                        if (docxRows.length > 0) {
                            children.push(new Table({ rows: docxRows }));
                        }
                    }
                } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    const cleanLine = line.trim().replace(/^[\-*]\s+/, '');
                    children.push(new DocxParagraph({ children: processText(cleanLine), bullet: { level: 0 } }));
                } else if (/^\d+\.\s/.test(line.trim())) {
                    const cleanLine = line.trim().replace(/^\d+\.\s+/, '');
                    children.push(new DocxParagraph({ children: processText(cleanLine), bullet: { level: 0 } }));
                } else if (line.trim() !== '') {
                    children.push(new DocxParagraph({ children: processText(line), spacing: { after: 200 } }));
                } else {
                    children.push(new DocxParagraph({ text: '' }));
                }
            }
            const doc = new Document({ sections: [{ properties: {}, children }] });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `AI_Content_${new Date().getTime()}.docx`);
            message.success('Word 文档生成成功');
        } catch (err) {
            console.error(err);
            message.error('生成 Word 文档失败');
        } finally {
            setExportLoading(null);
        }
    };

    // 导出 PDF：只导出当前 assistant 的 content 渲染内容（与对话框一致，非原始 MD）；克隆对话框已渲染的 .markdown-content，白底样式
    const exportToPDF = async (index: number) => {
        const msg = currentMessages[index];
        if (!msg || msg.role !== 'assistant') return;
        const raw = typeof msg.content === 'string' ? msg.content : '';
        if (!raw.trim()) {
            message.warning('当前回复无正文内容');
            return;
        }
        setExportLoading({ type: 'pdf', index });
        try {
            const contentWidth = 595;
            const msgRoot = document.getElementById(`chat-msg-content-${index}`);
            const markdownEl = msgRoot?.querySelector('.markdown-content') as HTMLElement | null;

            // 若有 mermaid，轮询等待流程图 SVG 渲染完成再克隆（最多等 4 秒），避免导出空白块
            if (raw.includes('```mermaid') && markdownEl) {
                const mermaidCount = (raw.match(/```mermaid/g) || []).length;
                const deadline = Date.now() + 4000;
                while (Date.now() < deadline) {
                    const svgCount = markdownEl.querySelectorAll('svg').length;
                    if (svgCount >= mermaidCount) break;
                    await new Promise(r => setTimeout(r, 300));
                }
            }

            const contentEl = document.getElementById(`chat-msg-content-${index}`)?.querySelector('.markdown-content') as HTMLElement | null;
            let clone: HTMLElement;

            if (contentEl) {
                // 克隆对话框中已渲染的 markdown 区域（与对话框同一套渲染结果：MermaidDiagram 的 TD/LR、上色、尺寸）
                clone = contentEl.cloneNode(true) as HTMLElement;
                clone.style.width = contentWidth + 'px';
                clone.style.maxWidth = contentWidth + 'px';
                clone.style.overflow = 'visible';
                clone.querySelectorAll('*').forEach((el: Element) => {
                    const html = el as HTMLElement;
                    html.style.maxWidth = 'none';
                    (html.style as any).maxHeight = 'none';
                    if (html.style.overflow === 'auto' || html.style.overflow === 'scroll') html.style.overflow = 'visible';
                });
                // 先不在此处转 SVG→图：等挂到 DOM 后再转，否则 html2canvas(svg) 对未挂载节点易失败
            } else {
                // 未找到已渲染节点时回退：纯文本 + 白底（避免完全失败）
                clone = document.createElement('div');
                clone.style.width = contentWidth + 'px';
                clone.style.maxWidth = contentWidth + 'px';
                clone.style.overflow = 'visible';
                clone.style.whiteSpace = 'pre-wrap';
                clone.style.wordBreak = 'break-word';
                clone.textContent = raw;
            }

            const wrap = document.createElement('div');
            wrap.className = 'pdf-export-light';
            wrap.style.cssText = `
                position: fixed; left: -99999px; top: 0;
                pointer-events: none;
                width: ${contentWidth + 40}px; max-width: ${contentWidth + 40}px;
                box-sizing: border-box;
                padding: 12px 20px;
                background: #ffffff;
                border: none;
                font-family: "PingFang SC", "Microsoft YaHei", "SimSun", "SimHei", sans-serif;
                font-size: 12px;
                line-height: 1.625;
                overflow: hidden;
                box-shadow: none;
            `;
            const style = document.createElement('style');
            style.textContent = `
                .pdf-export-light { box-shadow: none !important; }
                .pdf-export-light::-webkit-scrollbar { display: none !important; }
                .pdf-export-light { -ms-overflow-style: none; scrollbar-width: none; }
                .pdf-export-light, .pdf-export-light * { color: #334155 !important; border-color: #dee2e6 !important; }
                .pdf-export-light .markdown-content { line-height: 1.625; }
                .pdf-export-light .markdown-content h1, .pdf-export-light .markdown-content h2, .pdf-export-light .markdown-content h3,
                .pdf-export-light .markdown-content h4, .pdf-export-light .markdown-content h5, .pdf-export-light .markdown-content h6 { margin-bottom: 1.25rem !important; }
                .pdf-export-light .markdown-content div.my-4 { margin-top: 2rem !important; margin-bottom: 2rem !important; }
                .pdf-export-light pre, .pdf-export-light code { background: #f1f5f9 !important; color: #334155 !important; }
                .pdf-export-light a { color: #2563eb !important; }
                .pdf-export-light svg, .pdf-export-light svg * { line-height: normal !important; }
                .pdf-export-light svg { background: transparent !important; }
                .pdf-export-light .cluster rect { fill: transparent !important; }
                .pdf-export-light .edgeLabel, .pdf-export-light .edgeLabel * { color: #334155 !important; fill: #334155 !important; }
                .pdf-export-light .edgeLabel rect { fill: #ffffff !important; opacity: 0 !important; }
            `;
            wrap.appendChild(style);
            wrap.appendChild(clone);
            document.body.appendChild(wrap);

            await new Promise(r => setTimeout(r, 250));

            // 按对话框渲染规则：在 DOM 内将每个流程图 SVG 转为 img，否则 html2canvas(wrap) 会漏画部分 SVG
            if (contentEl) {
                const svgs = Array.from(clone.querySelectorAll('svg'));
                const loadPromises: Promise<void>[] = [];
                for (let i = 0; i < svgs.length; i++) {
                    const svg = svgs[i] as SVGSVGElement;
                    const rect = svg.getBoundingClientRect();
                    const w = Math.max(rect.width, 1);
                    const h = Math.max(rect.height, 1);
                    const img = document.createElement('img');
                    img.style.display = 'block';
                    img.style.margin = '0 auto';
                    img.style.maxWidth = '100%';
                    img.style.objectFit = 'contain';
                    img.style.width = w + 'px';
                    img.style.height = h + 'px';

                    try {
                        const svgCanvas = await html2canvas(svg, {
                            scale: 2,
                            backgroundColor: 'transparent',
                            logging: false,
                            useCORS: true,
                        });
                        if (svgCanvas.width >= 4 && svgCanvas.height >= 4) {
                            img.src = svgCanvas.toDataURL('image/png');
                        } else {
                            throw new Error('canvas too small');
                        }
                    } catch {
                        // 备用：SVG 序列化为 data URL，保证每个流程图都变成图片
                        try {
                            const serialized = new XMLSerializer().serializeToString(svg);
                            const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serialized)));
                            img.src = dataUrl;
                            loadPromises.push(new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => resolve();
                                setTimeout(resolve, 800);
                            }));
                        } catch (_) {}
                    }
                    svg.parentNode?.replaceChild(img, svg);
                }
                await Promise.all(loadPromises);
                await new Promise(r => setTimeout(r, 150));
            }

            clone.style.height = 'auto';
            clone.style.minHeight = 'auto';
            const fullHeight = Math.max(clone.scrollHeight, 100);
            clone.style.height = fullHeight + 'px';
            clone.style.minHeight = fullHeight + 'px';

            // 用容器真实尺寸截图（虚拟 div 在视口外 -99999px，用户无感）
            const wrapW = wrap.offsetWidth;
            const wrapH = wrap.offsetHeight;

            const canvas = await html2canvas(wrap, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: wrapW,
                height: wrapH,
                windowWidth: wrapW,
                windowHeight: wrapH,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
            });
            document.body.removeChild(wrap);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgH = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgH;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgH);
            heightLeft -= pdfHeight;
            while (heightLeft > 0) {
                position = heightLeft - imgH;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgH);
                heightLeft -= pdfHeight;
            }
            pdf.save(`AI_Content_${new Date().getTime()}.pdf`);
            message.success('PDF 文档生成成功');
        } catch (err) {
            console.error(err);
            message.error('生成 PDF 文档失败: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setExportLoading(null);
        }
    };

    // Current session's messages (derived from sessions + currentSessionId)
    const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages ?? [];

    // Load models and history on mount
    useEffect(() => {
        // Load available chat models
        getChatModels().then(res => {
            if (res.code === 200 && Array.isArray(res.data)) {
                const options = res.data as Array<{ label: string; value: string }>;
                setAvailableModels(options);
                if (options.length > 0) setSelectedModel(options[0].value);
            }
        }).catch(console.error);

        // 有后台菜单才显示「后台管理」入口
        getCurrentUserMenus().then(res => {
            if (res.code === 200 && res.data) {
                const menus = res.data.menus;
                const paths = res.data.allowed_paths;
                const hasMenus = (Array.isArray(menus) && menus.length > 0) || (Array.isArray(paths) && paths.length > 0);
                setHasAdminMenus(hasMenus);
            }
        }).catch(() => setHasAdminMenus(false));

        // Load chat history；无选中会话时：有历史则自动选第一条，无历史则自动新建（仅建 1 条，避免 StrictMode 双执行）
        loadHistory().then(apiSessions => {
            setCurrentSessionId(prev => {
                if (prev != null) return prev;
                if (apiSessions.length > 0) return apiSessions[0].id;
                return null;
            });
            if (apiSessions.length === 0) {
                if (autoCreateSessionDoneRef.current) return;
                autoCreateSessionDoneRef.current = true;
                createChatSession("新对话").then(res => {
                    if (res.code === 200) {
                        const newSession: ChatSession = {
                            id: res.data.id,
                            title: res.data.title,
                            time: '刚刚',
                            messages: []
                        };
                        setSessions(prev => [newSession, ...prev]);
                        setCurrentSessionId(newSession.id);
                    }
                }).catch(() => message.error("创建会话失败"));
            }
        });
    }, []);

    // 刷新后会话列表从接口加载完成时，若当前未选中或选中的不在列表中，则自动选中第一条，避免“刷新后会话没了”
    useEffect(() => {
        if (sessions.length === 0) return;
        const hasValidSelection = currentSessionId && sessions.some(s => s.id === currentSessionId);
        if (!hasValidSelection) setCurrentSessionId(sessions[0].id);
    }, [sessions]);

    const loadHistory = async (): Promise<ChatSession[]> => {
        try {
            const res = await getChatHistory(1, 100);
            if (res.code === 200 && res.data.list) {
                const apiSessions: ChatSession[] = res.data.list.map((s: ApiChatSession) => ({
                    id: s.id,
                    title: s.title,
                    time: s.updated_time ? new Date(s.updated_time).toLocaleDateString() : '',
                    messages: [] as ExtendedChatMessage[]
                }));
                // 合并 API 列表与本地 state：保留已有会话的 messages，避免刷新后点击无内容；标题以 API 为准（后端根据首条对话生成）
                setSessions(prev => {
                    const prevById = new Map(prev.map(s => [s.id, s]));
                    return apiSessions.map(api => {
                        const existing = prevById.get(api.id);
                        return {
                            ...api,
                            messages: existing?.messages?.length ? existing.messages : api.messages
                        };
                    });
                });
                return apiSessions;
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
        return [];
    };

    // Load messages when session changes
    useEffect(() => {
        if (!currentSessionId) return;
        // 临时会话 id（pending-xxx）不存在于后端，不请求消息列表
        if (currentSessionId.startsWith('pending-')) return;

        const session = sessions.find(s => s.id === currentSessionId);
        if (!session) return;
        if (session.messages.length > 0) return;

        // 对后端真实会话（非 pending-）拉取消息；用请求时的 sessionId 更新，避免切会话后把消息写到错误会话
        const requestedSessionId = currentSessionId;
        setIsLoading(true);
        getChatMessages(requestedSessionId).then(res => {
            const code = (res as any)?.code ?? (res as any)?.Code;
            if (code !== 200 && code !== '200') return;
            const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray((res as any)?.Data) ? (res as any).Data : [];
            const loadedMessages = list.map((m: any) => {
                let content: string | any[] = m.content ?? m.Content ?? '';
                // 用户消息可能存的是 JSON 数组（含图片），解析后恢复展示
                if (typeof content === 'string' && content.trimStart().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(content);
                        if (Array.isArray(parsed)) content = parsed;
                    } catch (_) { /* 保持字符串 */ }
                }
                return {
                    role: (m.role || '').toLowerCase() === 'user' ? 'user' : (m.role || '').toLowerCase() === 'system' ? 'system' : 'assistant',
                    content,
                    meta: m.meta ?? m.Meta ?? undefined,
                    thinking: false,
                    reasoning: m.thinking || m.reasoning || '',
                    reasoningCollapsed: true,
                    time: m.created_time ?? m.CreatedTime ?? m.createdTime ?? m.updatedTime ?? m.UpdatedTime
                };
            });
            setSessions(prev => prev.map(s =>
                s.id === requestedSessionId ? { ...s, messages: loadedMessages } : s
            ));
        }).finally(() => setIsLoading(false));
    }, [currentSessionId]);

    const handleNewChat = async () => {
        try {
            const res = await createChatSession("新对话");
            if (res.code === 200) {
                const newSession: ChatSession = {
                    id: res.data.id,
                    title: res.data.title,
                    time: '刚刚',
                    messages: []
                };
                setSessions([newSession, ...sessions]);
                setCurrentSessionId(newSession.id);
            }
        } catch (e) {
            message.error("创建会话失败");
        }
    };

    const handleDeleteSession = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await deleteChatSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) {
                setCurrentSessionId(null);
            }
            message.success("删除成功");
        } catch (err) {
            message.error("删除失败");
        }
    };

    const updateCurrentSessionMessages = (newMessages: ExtendedChatMessage[], targetSessionId?: string | null) => {
        const sid = targetSessionId !== undefined ? targetSessionId : currentSessionId;
        if (!sid) return;
        setSessions(prev => prev.map(s => 
            s.id === sid ? { ...s, messages: newMessages } : s
        ));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            if (!files[i].type.startsWith('image/')) {
                message.warning(`${files[i].name} 不是有效的图片`);
                continue;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                if (base64) setUploadedImages(prev => [...prev, base64]);
            };
            reader.readAsDataURL(files[i]);
        }
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const allowed = ['.txt', '.pdf', '.doc', '.docx'];
        const toUpload: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const ext = '.' + (files[i].name.split('.').pop() || '').toLowerCase();
            if (!allowed.includes(ext)) {
                message.warning(`仅支持 txt、pdf、word：${files[i].name}`);
                continue;
            }
            toUpload.push(files[i]);
        }
        if (toUpload.length === 0) return;
        try {
            const res = await uploadChatFile(toUpload);
            if (res.code === 200 && res.data?.length) {
                setUploadedFiles(prev => [...prev, ...res.data!]);
            } else {
                message.error(res.msg || '上传失败');
            }
        } catch (err: any) {
            message.error(err.response?.data?.msg || '上传失败');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async () => {
        const hasInput = input.trim() || uploadedImages.length > 0 || uploadedFiles.length > 0;
        if (!hasInput || isLoading) return;

        // 无对话 id 时先建一个本地临时会话，后端会在首次请求时自动新建并返回 X-Chat-Session-Id
        let sessionIdToUse = currentSessionId;
        if (!currentSessionId) {
            const tempId = 'pending-' + Date.now();
            setSessions(prev => [{ id: tempId, title: '新对话', time: '刚刚', messages: [] }, ...prev]);
            setCurrentSessionId(tempId);
            sessionIdToUse = tempId;
        }

        // 展示/保存用：仅用户输入，文件名与链接只在下方的「已上传」区域显示
        const contentStrForDisplayAndSave = input.trim();
        // 发给 AI 的上下文：含附件解析正文，供模型理解
        const contentStrForApi = input.trim() + (uploadedFiles.length
            ? '\n\n' + uploadedFiles.map(f => `[附件 ${f.file_name}]\n${f.content || ''}`).join('\n\n')
            : '');

        let userContent: string | any[] = contentStrForDisplayAndSave;
        if (uploadedImages.length > 0) {
            userContent = [
                { type: 'text', text: contentStrForDisplayAndSave || '请分析图片' },
                ...uploadedImages.map(url => ({ type: 'image_url', image_url: { url } }))
            ];
        }

        const metaForSave = uploadedFiles.length
            ? JSON.stringify({
                file_names: uploadedFiles.map(f => f.file_name),
                file_urls: uploadedFiles.map(f => f.url),
                file_contents: uploadedFiles.map(f => f.content || ''),
            })
            : undefined;

        const userMsg: ExtendedChatMessage & { meta?: string } = {
            role: 'user',
            content: userContent,
            time: new Date().toLocaleTimeString()
        };
        if (metaForSave) userMsg.meta = metaForSave;

        const updatedMessages = [...(sessions.find(s => s.id === sessionIdToUse)?.messages ?? []), userMsg];
        updateCurrentSessionMessages(updatedMessages, sessionIdToUse);
        setInput('');
        setUploadedImages([]);
        setUploadedFiles([]);
        setIsLoading(true);

        const assistantMsg: ExtendedChatMessage = {
            role: 'assistant',
            model: selectedModel,
            content: '',
            thinking: true
        };
        updateCurrentSessionMessages([...updatedMessages, assistantMsg], sessionIdToUse);

        try {
            // 上下文消息：发给 AI 时用含附件解析正文的 contentStrForApi，展示/保存用 contentStrForDisplayAndSave
            const lastUserContentForApi = uploadedImages.length > 0
                ? [{ type: 'text' as const, text: contentStrForApi }, ...uploadedImages.map((url: string) => ({ type: 'image_url' as const, image_url: { url } }))]
                : contentStrForApi;
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            const contextMessages = updatedMessages.slice(-10).map((m) => {
                const isLastUserMsg = m === lastMsg && m.role === 'user';
                return {
                    role: m.role,
                    content: isLastUserMsg ? lastUserContentForApi : (typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? (m.content.find((c: any) => c.type === 'text')?.text ?? '') : ''))
                };
            });

            // AI 助手专用接口：用户 token + 租户聊天应用配置，后端无 session 时自动新建
            const effectiveSessionId = currentSessionId?.startsWith?.('pending-') ? undefined : currentSessionId;
            const response = await chatCompletionsStreamAssistant(
                {
                    model: selectedModel,
                    messages: contextMessages,
                    temperature: 0.7,
                    stream: true
                } as ChatCompletionRequest,
                effectiveSessionId
            );

            // 后端新建会话时返回 X-Chat-Session-Id，替换本地临时 id
            const newSessionId = response.headers.get('X-Chat-Session-Id');
            if (newSessionId && sessionIdToUse?.startsWith?.('pending-')) {
                setSessions(prev => prev.map(s => s.id === sessionIdToUse ? { ...s, id: newSessionId } : s));
                setCurrentSessionId(newSessionId);
                sessionIdToUse = newSessionId;
            } else if (newSessionId) {
                sessionIdToUse = newSessionId;
            }
            const effectiveSessionIdForStream = sessionIdToUse;
            const isRealSessionId = !String(effectiveSessionIdForStream).startsWith('pending-');

            if (isRealSessionId) {
                try {
                    // 有图片时保存完整 content（JSON 数组），刷新后可恢复图片；纯文本仍保存字符串
                    let contentToSave: string = Array.isArray(userContent)
                        ? JSON.stringify(userContent)
                        : contentStrForDisplayAndSave;
                    // 确保有用户输入时 content 不为空（避免大 body 被截断等导致后端收到空 content）
                    if (!contentToSave?.trim() && contentStrForDisplayAndSave?.trim()) {
                        contentToSave = contentStrForDisplayAndSave;
                    }
                    await saveChatMessage({
                        session_id: sessionIdToUse!,
                        role: 'user',
                        content: contentToSave,
                        meta: metaForSave
                    });
                } catch (e) {
                    console.error("Failed to save user message", e);
                }
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error((errData as any).msg || (errData as any).error || 'Request failed');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let fullReasoning = '';
            let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } = {};
            let finalRequestId = '';
            const startTime = Date.now();
            let ttft = 0;
            let firstToken = true;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);

                                if (data.type === 'x_tool_info' && data.info) {
                                    setSessions(prev => prev.map(s => {
                                        if (s.id !== effectiveSessionIdForStream) return s;
                                        const msgs = [...s.messages];
                                        const currentMsg = msgs[msgs.length - 1];
                                        if (!currentMsg) return s;
                                        let updatedSteps = [...(currentMsg.steps || [])];
                                        Object.entries(data.info as Record<string, string>).forEach(([toolName, displayName]) => {
                                            updatedSteps = updatedSteps.map(step =>
                                                step.type === 'tool' && step.toolName === toolName ? { ...step, displayName } : step
                                            );
                                        });
                                        msgs[msgs.length - 1] = { ...currentMsg, steps: updatedSteps };
                                        return { ...s, messages: msgs };
                                    }));
                                    continue;
                                }

                                const delta = data.choices?.[0]?.delta;
                                const content = delta?.content || '';
                                const reasoning = delta?.reasoning_content || '';
                                const toolCalls = delta?.tool_calls;
                                const chunkId = data.id;
                                if (chunkId) finalRequestId = chunkId;
                                if (data.usage) usage = data.usage;

                                if (firstToken && (content || reasoning || (toolCalls && toolCalls.length > 0))) {
                                    ttft = Date.now() - startTime;
                                    firstToken = false;
                                }

                                const prevContentLength = fullContent.length;
                                fullContent += content;
                                fullReasoning += reasoning;
                                const shouldCollapse = prevContentLength === 0 && fullContent.length > 0;

                                setSessions(prev => prev.map(s => {
                                    if (s.id !== effectiveSessionIdForStream) return s;
                                    const msgs = [...s.messages];
                                    const currentMsg = msgs[msgs.length - 1];
                                    if (!currentMsg) return s;
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
                                                    index,
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

                                    msgs[msgs.length - 1] = {
                                        ...currentMsg,
                                        content: fullContent,
                                        reasoning: fullReasoning,
                                        reasoningCollapsed: shouldCollapse ? true : currentMsg.reasoningCollapsed,
                                        thinking: false,
                                        steps: updatedSteps,
                                        meta: {
                                            ...currentMsg.meta,
                                            requestId: finalRequestId || currentMsg.meta?.requestId,
                                            inputTokens: usage.prompt_tokens,
                                            outputTokens: usage.completion_tokens,
                                            totalTokens: usage.total_tokens,
                                            tokens: usage.total_tokens ?? Math.ceil((fullContent.length + fullReasoning.length) / 4)
                                        } as ExtendedChatMessage['meta']
                                    };
                                    return { ...s, messages: msgs };
                                }));
                            } catch (e) {}
                        }
                    }
                }
            }

            const endTime = Date.now();
            setSessions(prev => prev.map(s => {
                if (s.id !== effectiveSessionIdForStream) return s;
                const msgs = [...s.messages];
                const currentMsg = msgs[msgs.length - 1];
                if (!currentMsg) return s;
                msgs[msgs.length - 1] = {
                    ...currentMsg,
                    meta: {
                        ...currentMsg.meta,
                        ttft: ttft ? `${ttft}ms` : undefined,
                        inputTokens: usage.prompt_tokens,
                        outputTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                        tokens: usage.total_tokens ?? Math.ceil((fullContent.length + fullReasoning.length) / 4),
                        time: `${((endTime - startTime) / 1000).toFixed(1)}s`,
                        requestId: finalRequestId || currentMsg.meta?.requestId
                    }
                };
                return { ...s, messages: msgs };
            }));

            // Save assistant message（仅当会话 id 为后端真实 id 时保存，避免 pending-xxx 导致 403）
            if (isRealSessionId) {
                try {
                    await saveChatMessage({
                        session_id: effectiveSessionIdForStream,
                        role: 'assistant',
                        content: fullContent,
                        thinking: fullReasoning
                    });
                } catch (e) {
                    console.error("Failed to save assistant message", e);
                }
            }

            // Reload history to update title if it was new
            const currentSession = sessions.find(s => s.id === effectiveSessionIdForStream);
            if (currentSession?.title === '新对话') {
                loadHistory(); // Refresh list to get new title
            }

        } catch (e) {
            console.error(e);
            message.error('发送失败');
        } finally {
            setIsLoading(false);
        }
    };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const count = currentMessages.length;
    if (count > prevMessageCountRef.current) {
      scrollToBottom();
      prevMessageCountRef.current = count;
    } else {
      prevMessageCountRef.current = count;
    }
  }, [currentMessages]);

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      const res = await changePassword(values.oldPassword, values.newPassword);
      if (res.code === 200) {
        message.success('密码修改成功，请重新登录');
        setIsPasswordModalOpen(false);
        passwordForm.resetFields();
        removeToken();
        navigate('/login');
      } else {
        message.error(res.msg || '密码修改失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '网络错误，请稍后再试');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#137fec',
          colorBgContainer: '#1a2632',
          colorBgBase: '#101922',
        },
      }}
    >
      <Layout className="h-screen overflow-hidden bg-[#101922]">
        {/* Chat Sidebar */}
        <Sider width={260} className="border-r border-[#233648] bg-[#111a22] flex flex-col" style={{ backgroundColor: '#111a22' }}>
          <div className="p-4 flex flex-col h-full">
            {/* Header */}
            <div 
              className="flex items-center gap-2 mb-6 px-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
               <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white">
                  <RobotOutlined />
               </div>
               <span className="text-lg font-bold text-white">AI 助手</span>
            </div>

            {/* New Chat Button */}
            <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                className="w-full mb-6 h-10 rounded-lg bg-primary hover:bg-blue-600 border-none flex items-center justify-center gap-2"
                onClick={handleNewChat}
            >
                开启新对话
            </Button>

            {/* History List */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar">
                <div className="mb-2 text-xs text-slate-500 font-bold px-3 uppercase">最近对话</div>
                <div className="space-y-1">
                    {sessions.map(session => (
                        <div 
                            key={session.id}
                            className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                                currentSessionId === session.id 
                                ? 'bg-[#1a2632] text-white' 
                                : 'text-slate-400 hover:bg-[#1a2632]/50 hover:text-slate-200'
                            }`}
                            onClick={() => {
                              setCurrentSessionId(session.id);
                              if (session.selectedModelId && availableModels.some(m => m.value === session.selectedModelId)) {
                                setSelectedModel(session.selectedModelId);
                              } else if (availableModels.length > 0) {
                                setSelectedModel(availableModels[0].value);
                              }
                            }}
                        >
                            <MessageOutlined className="shrink-0" />
                            <div className="flex-1 truncate text-sm">{session.title}</div>
                            <Dropdown 
                                menu={{ 
                                    items: [{ 
                                        key: 'del', 
                                        label: '删除', 
                                        icon: <DeleteOutlined />, 
                                        danger: true, 
                                        onClick: (info: { domEvent?: React.MouseEvent }) => {
                                            info.domEvent?.stopPropagation();
                                            handleDeleteSession(session.id, info.domEvent);
                                        }
                                    }] 
                                }} 
                                trigger={['click']}
                            >
                                <span 
                                    className={`inline-flex p-0.5 rounded text-slate-500 hover:text-white hover:bg-white/10 ${currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <MoreOutlined />
                                </span>
                            </Dropdown>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </Sider>

        {/* Main Chat Area */}
        <Layout className="bg-[#101922]">
            {/* Header */}
            <div className="h-16 border-b border-[#233648] bg-[#111a22]/50 backdrop-blur flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                     {/* Model Selector：仅更新当前会话的 selectedModelId 与全局 selectedModel，不触发重载消息 */}
                     <select 
                        className="bg-[#1a2632] text-slate-300 text-xs border border-[#233648] rounded px-2 py-1 outline-none focus:border-primary"
                        value={selectedModel}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedModel(value);
                          if (currentSessionId) {
                            setSessions(prev => prev.map(s =>
                              s.id === currentSessionId ? { ...s, selectedModelId: value } : s
                            ));
                          }
                        }}
                     >
                        {availableModels.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        {availableModels.length === 0 && <option value="">Loading models...</option>}
                     </select>
                    <span className="text-white font-bold text-lg">{sessions.find(s => s.id === currentSessionId)?.title || '新对话'}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">System Operational</span>
                </div>
                <div className="flex items-center gap-4">
                     {hasAdminMenus && (
                       <>
                         <Button 
                            type="text"
                            icon={<AppstoreOutlined />}
                            className="text-slate-400 hover:text-white"
                            onClick={() => navigate('/admin')}
                         >
                            后台管理
                         </Button>
                         <div className="h-4 w-px bg-[#233648]"></div>
                       </>
                     )}
                    {/* 右上角用户信息卡片 - 按设计稿 */}
                    <div className="flex items-center gap-4 rounded-xl bg-[#1A212E] border border-[#2a3548] px-4 py-2.5 shadow-sm">
                        <Avatar 
                            src={user?.avatar || avatarImg} 
                            className="!w-11 !h-11 !flex !items-center !justify-center bg-[#D9C3A6] border-2 border-white/90 shrink-0" 
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-white truncate">
                                {user?.nickname || user?.username || '用户'}
                            </span>
                            <span className="text-xs text-slate-300 truncate">
                                {user?.email || user?.username || '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-1">
                            <Tooltip title="修改密码">
                                <span 
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#233648] cursor-pointer transition-colors"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                >
                                    <KeyOutlined className="text-base" />
                                </span>
                            </Tooltip>
                            <Tooltip title="退出登录">
                                <span 
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#233648] cursor-pointer transition-colors"
                                    onClick={() => { removeToken(); navigate('/login'); }}
                                >
                                    <LogoutOutlined className="text-base" />
                                </span>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <Content className="flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar scroll-smooth">
                    {currentMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 space-y-4">
                            <div className="size-20 rounded-2xl bg-[#1a2632] flex items-center justify-center">
                                <RobotOutlined style={{ fontSize: 40 }} />
                            </div>
                            <p className="text-lg font-medium">有什么我可以帮你的吗？</p>
                        </div>
                    ) : (
                        currentMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} max-w-6xl mx-auto w-full`}>
                                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-green-600/20 text-green-500'
                                }`}>
                                    {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                </div>
                                
                                <div className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {msg.role === 'assistant' && msg.model && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-bold text-sm">{msg.model}</span>
                                        </div>
                                    )}
                                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-[#1a2632] text-white border border-[#233648] rounded-tr-none' 
                                        : 'bg-[#1a2632] border border-[#233648] text-slate-200 rounded-tl-sm w-full'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            <div className="space-y-2">
                                                {Array.isArray(msg.content) ? (
                                                    <>
                                                        <div className="markdown-content">{msg.content.find((c: any) => c.type === 'text')?.text || ''}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.content.filter((c: any) => c.type === 'image_url').map((img: any, i: number) => (
                                                                <img key={i} src={img.image_url?.url} alt="" className="max-w-[200px] max-h-[200px] rounded-lg border border-[#233648] object-cover" />
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="markdown-content">{typeof msg.content === 'string' ? msg.content : ''}</div>
                                                )}
                                                {(() => {
                                                    try {
                                                        const raw = (msg as any).meta;
                                                        if (raw == null) return null;
                                                        const meta = typeof raw === 'string' ? (raw ? JSON.parse(raw) : null) : raw;
                                                        const names = meta?.file_names as string[] | undefined;
                                                        const urls = meta?.file_urls as string[] | undefined;
                                                        if (!names?.length) return null;
                                                        return (
                                                            <div className="pt-2 border-t border-[#233648]/50 text-xs text-slate-400">
                                                                已上传: {names.map((n, i) => urls?.[i] ? <a key={i} href={(String(urls[i]).startsWith('http') ? '' : API_ORIGIN) + urls[i]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-1">{n}</a> : <span key={i} className="mr-1">{n}</span>)}
                                                            </div>
                                                        );
                                                    } catch (_) {}
                                                    return null;
                                                })()}
                                            </div>
                                        ) : msg.thinking ? (
                                            <div className="flex items-center gap-2 text-slate-400 italic">
                                                <LoadingOutlined />
                                                <span>正在思考中...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* 将 ID 移到此处，包含思维链、步骤和正文 */}
                                                <div id={`chat-msg-content-${idx}`}>
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
                                                                onClick={() => updateCurrentSessionMessages(currentMessages.map((m, i) => i === idx ? { ...m, reasoningCollapsed: !m.reasoningCollapsed } : m))}
                                                            >
                                                                <div className="text-primary/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                                    <ThunderboltFilled className="text-[10px]" />
                                                                    <span>Thinking Process</span>
                                                                </div>
                                                                <div className="text-slate-500 text-[10px]">{msg.reasoningCollapsed ? '展开' : '折叠'}</div>
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
                                                                                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                                                                        {String(children).replace(/\n$/, '')}
                                                                                    </SyntaxHighlighter>
                                                                                ) : (
                                                                                    <code className={className} {...props}>{children}</code>
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
                                                                    const lang = match?.[1] || '';
                                                                    const codeStr = String(children).replace(/\n$/, '');
                                                                    if (!inline && lang === 'mermaid') {
                                                                        return <MermaidDiagram>{codeStr}</MermaidDiagram>;
                                                                    }
                                                                    return !inline && match ? (
                                                                        <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div" className="rounded-lg my-2 !bg-[#0d1117]" {...props}>
                                                                            {codeStr}
                                                                        </SyntaxHighlighter>
                                                                    ) : (
                                                                        <code className="bg-[#0d1117] px-1.5 py-0.5 rounded text-primary font-mono text-xs" {...props}>{children}</code>
                                                                    );
                                                                },
                                                                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                                h1: ({ children }) => <h1 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-white border-b border-[#233648] pb-2">{children}</h1>,
                                                                h2: ({ children }) => <h2 className="text-base font-bold mb-3 mt-5 first:mt-0 text-white">{children}</h2>,
                                                                h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-4 first:mt-0 text-white">{children}</h3>,
                                                                h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-white">{children}</h4>,
                                                                h5: ({ children }) => <h5 className="text-xs font-semibold mb-1.5 mt-2 first:mt-0 text-slate-200">{children}</h5>,
                                                                h6: ({ children }) => <h6 className="text-xs font-medium mb-1 mt-2 first:mt-0 text-slate-300">{children}</h6>,
                                                                ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
                                                                ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
                                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 py-1 my-4 italic text-slate-400 bg-primary/5 rounded-r">{children}</blockquote>,
                                                                table: ({ children }) => <div className="overflow-x-auto my-4 rounded-lg border border-[#233648]"><table className="w-full border-collapse">{children}</table></div>,
                                                                thead: ({ children }) => <thead className="bg-[#111a22]">{children}</thead>,
                                                                tbody: ({ children }) => <tbody className="text-slate-200">{children}</tbody>,
                                                                tr: ({ children }) => <tr className="border-b border-[#233648] last:border-b-0">{children}</tr>,
                                                                th: ({ children }) => <th className="border border-[#233648] bg-[#1a2632] px-3 py-2 text-left font-bold text-white text-xs">{children}</th>,
                                                                td: ({ children }) => <td className="border border-[#233648] px-3 py-2 text-xs">{children}</td>,
                                                                hr: () => <hr className="my-6 border-[#233648]" />,
                                                                a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                                                            }}
                                                        >
                                                            {typeof msg.content === 'string' ? msg.content : ''}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                                {msg.role === 'assistant' && isWritingMode && msg.content && !msg.thinking && (
                                                    <div className="flex gap-2 mt-4 pt-3 border-t border-[#233648]/50">
                                                        <Button 
                                                            size="small" 
                                                            icon={<FileWordOutlined />} 
                                                            loading={exportLoading?.type === 'word' && exportLoading?.index === idx}
                                                            disabled={exportLoading !== null && exportLoading.index === idx}
                                                            onClick={() => exportToWord(msg.content as string, idx)}
                                                            className="bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30"
                                                        >
                                                            导出 Word
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            icon={<FilePdfOutlined />} 
                                                            loading={exportLoading?.type === 'pdf' && exportLoading?.index === idx}
                                                            disabled={exportLoading !== null && exportLoading.index === idx}
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
                                    {msg.role === 'assistant' && msg.meta && (
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
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 pt-0">
                    <div className="max-w-6xl mx-auto relative bg-[#1a2632] border border-[#233648] rounded-xl shadow-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
                        <TextArea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPressEnter={e => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="输入消息..."
                            autoSize={{ minRows: 2, maxRows: 8 }}
                            className="bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 resize-none p-4 text-sm"
                        />
                        <input type="file" ref={imageInputRef} accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        <input type="file" ref={fileInputRef} accept=".txt,.pdf,.doc,.docx" multiple className="hidden" onChange={handleFileUpload} />
                        {(uploadedImages.length > 0 || uploadedFiles.length > 0) && (
                            <div className="px-3 py-2 border-t border-[#233648]/50 flex flex-wrap gap-2 items-center">
                                {uploadedImages.map((url, i) => (
                                    <div key={i} className="relative inline-block">
                                        <img src={url} alt="" className="w-14 h-14 rounded border border-[#233648] object-cover" />
                                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center cursor-pointer text-white text-xs" onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}>×</span>
                                    </div>
                                ))}
                                {uploadedFiles.map((f, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#111a22] border border-[#233648] text-xs text-slate-400">
                                        <FileTextOutlined /> {f.file_name}
                                        <CloseOutlined className="cursor-pointer hover:text-white" onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} />
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between items-center px-3 py-2 bg-[#1a2632] border-t border-[#233648]/50">
                            <div className="flex gap-2 items-center">
                                <Tooltip title="上传图片">
                                    <Button type="text" icon={<PictureOutlined />} size="small" className="text-slate-400 hover:text-white" onClick={() => imageInputRef.current?.click()} />
                                </Tooltip>
                                <Tooltip title="上传文件 (txt/pdf/word)">
                                    <Button type="text" icon={<PaperClipOutlined />} size="small" className="text-slate-400 hover:text-white" onClick={() => fileInputRef.current?.click()} />
                                </Tooltip>
                                <div className="w-px h-4 bg-[#233648] mx-1" />
                                <div 
                                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer" 
                                    onClick={() => setIsWritingMode(!isWritingMode)}
                                >
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
                            <Button 
                                type="primary" 
                                size="small"
                                icon={isLoading ? <LoadingOutlined /> : <SendOutlined />}
                                onClick={handleSendMessage}
                                disabled={isLoading || (!input.trim() && uploadedImages.length === 0 && uploadedFiles.length === 0)}
                                className="bg-primary hover:bg-blue-600"
                            />
                        </div>
                    </div>
                    <div className="text-center mt-2 text-[10px] text-slate-500">
                        AI 生成的内容可能不准确，请谨慎使用。
                    </div>
                </div>
            </Content>
        </Layout>
      </Layout>

      {/* 修改密码弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <KeyOutlined className="text-blue-500" />
            </div>
            <span className="text-white font-semibold">安全设置 - 修改密码</span>
          </div>
        }
        open={isPasswordModalOpen}
        onOk={() => passwordForm.submit()}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        confirmLoading={passwordLoading}
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
          form={passwordForm}
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
              { max: 20, message: '密码长度不能超过 20 位' },
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
    </ConfigProvider>
  );
};

export default ChatPage;
