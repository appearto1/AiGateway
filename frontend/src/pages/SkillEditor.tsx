import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  FolderOpenFilled,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileUnknownOutlined,
  CodeOutlined,
  CloseOutlined,
  SaveOutlined,
  CloudSyncOutlined,
  PlusOutlined,
  UploadOutlined,
  SettingOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  MenuOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';
import { Button, Tag, Breadcrumb, Tabs, Tooltip, message, Spin } from 'antd';

// Types for File System
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string; // for editor syntax highlighting
  content?: string;
  children?: FileNode[];
  isOpen?: boolean; // for folders
}

// Mock Data
const initialFileTree: FileNode[] = [
  {
    id: 'root',
    name: 'skill-root',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'docs',
        name: 'docs',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'kb_md',
            name: 'knowledge_base.md',
            type: 'file',
            language: 'markdown',
            content: `# 产品核心规格说明书 (Knowledge Base)

## 1. 核心动力组件
- 电机型号: RX-450 HyperDrive
- 峰值功率: 1500W
- 最大扭矩: 120Nm

## 2. 传感器阵列
- 雷达探测范围: 25m @ 0.1° 精度
- 深度相机: 4K RGB-D, 120° FOV
- IMU: 9-轴高频采样

## 3. 指令集配置
instruction: "当用户询问关于机器人具体硬件参数时，必须优先从此 Markdown 中提取准确数值。如果信息不存在，请引导用户联系技术支持。"
`
          },
          {
            id: 'user_guide',
            name: 'user_guide.md',
            type: 'file',
            language: 'markdown',
            content: '# User Guide\n\nComing soon...'
          }
        ]
      },
      {
        id: 'config',
        name: 'config',
        type: 'folder',
        children: [
          {
            id: 'settings_json',
            name: 'settings.json',
            type: 'file',
            language: 'json',
            content: '{\n  "version": "1.0.0"\n}'
          }
        ]
      },
      {
        id: 'protocol',
        name: 'protocol_definition.json',
        type: 'file',
        language: 'json',
        content: '{\n  "protocol": "v2",\n  "timeout": 5000\n}'
      },
      {
        id: 'metadata',
        name: 'metadata.yaml',
        type: 'file',
        language: 'yaml',
        content: 'name: product_specs\nversion: 1.0.0\nauthor: admin'
      },
      {
        id: 'script',
        name: 'process_data.py',
        type: 'file',
        language: 'python',
        content: 'def process(data):\n    print("Processing data:", data)\n    return True'
      }
    ]
  }
];

// Helper to get file icon based on extension/name
const getFileIcon = (filename: string, type: 'file' | 'folder', isOpen?: boolean) => {
  if (type === 'folder') {
    return <FolderOpenFilled className={`text-blue-400 text-lg transition-transform ${!isOpen ? 'opacity-80' : ''}`} />;
  }
  if (filename.endsWith('.md')) return <FileMarkdownOutlined className="text-blue-300" />;
  if (filename.endsWith('.json')) return <CodeOutlined className="text-yellow-400" />;
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return <DatabaseOutlined className="text-purple-400" />;
  if (filename.endsWith('.py')) return <CodeOutlined className="text-green-400" />;
  if (filename.endsWith('.sh')) return <CodeOutlined className="text-gray-400" />;
  return <FileTextOutlined className="text-slate-400" />;
};

// Helper to find file by ID (recursive)
const findFile = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFile(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to get breadcrumb path
const getBreadcrumb = (nodes: FileNode[], targetId: string, currentPath: string[] = []): string[] | null => {
  for (const node of nodes) {
    if (node.id === targetId) return [...currentPath, node.name];
    if (node.children) {
      const path = getBreadcrumb(node.children, targetId, [...currentPath, node.name]);
      if (path) return path;
    }
  }
  return null;
};

const SkillEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fileTree, setFileTree] = useState<FileNode[]>(initialFileTree);
  const [activeFileId, setActiveFileId] = useState<string>('kb_md');
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [activeFileLanguage, setActiveFileLanguage] = useState<string>('markdown');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize active file
  useEffect(() => {
    const file = findFile(fileTree, activeFileId);
    if (file && file.type === 'file') {
      setActiveFileContent(file.content || '');
      setActiveFileLanguage(file.language || 'plaintext');
    }
  }, [activeFileId]); // Run only when ID changes to avoid overwriting edits if we were to support real-time sync, but here we keep simple.

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'folder') {
      // Toggle folder open state
      const toggleNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.id === node.id) return { ...n, isOpen: !n.isOpen };
          if (n.children) return { ...n, children: toggleNode(n.children) };
          return n;
        });
      };
      setFileTree(toggleNode(fileTree));
    } else {
      setActiveFileId(node.id);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    // In a real app, we'd update the file content in the tree or a separate buffer
    // For now, we just keep local state activeFileContent somewhat separate or update it
    if (value !== undefined) {
      setActiveFileContent(value);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      message.success('保存并同步成功');
    }, 1000);
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div 
          className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer text-sm select-none transition-colors
            ${node.id === activeFileId ? 'bg-[#264f78] text-white' : 'text-slate-400 hover:bg-[#2a2e35] hover:text-slate-200'}
          `}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleFileClick(node)}
        >
          <span className="flex items-center justify-center w-4 h-4 shrink-0">
             {node.type === 'folder' && (
                <span className={`transform transition-transform ${node.isOpen ? 'rotate-90' : ''}`}>
                    <RightOutlined style={{ fontSize: '10px' }} />
                </span>
             )}
          </span>
          <span className="shrink-0 flex items-center">{getFileIcon(node.name, node.type, node.isOpen)}</span>
          <span className="truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  const breadcrumbPath = getBreadcrumb(fileTree, activeFileId) || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d1117] text-slate-300 font-sans">
      {/* 1. Top Header */}
      <div className="h-14 border-b border-[#30363d] flex items-center justify-between px-4 bg-[#161b22] shrink-0">
        <div className="flex items-center gap-4">
          <div className="size-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
             <FileTextOutlined />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">编辑技能: 产品规格查询</span>
              <Tag color="success" className="bg-[#1f883d]/15 text-[#2da44e] border-0 text-[10px] px-1.5 leading-tight h-5 flex items-center">已发布</Tag>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button type="text" icon={<CloseOutlined className="text-slate-400 hover:text-white" />} onClick={() => navigate('/skills')} />
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div 
            className="flex flex-col border-r border-[#30363d] bg-[#0d1117]"
            style={{ width: sidebarWidth }}
        >
            {/* Tabs */}
            <div className="flex border-b border-[#30363d]">
                <div className="flex-1 text-center py-2 text-xs font-medium text-white border-b-2 border-[#f78166] bg-[#161b22] cursor-pointer">
                    文件管理
                </div>
                <div className="flex-1 text-center py-2 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-300 hover:bg-[#161b22]">
                    章节索引
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    <FolderOpenFilled /> 根目录 /
                </div>
                {renderTree(fileTree)}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-[#30363d] grid grid-cols-2 gap-2">
                <Button size="small" className="bg-[#21262d] border-[#30363d] text-slate-300 hover:border-[#8b949e] hover:text-white text-xs">
                    <UploadOutlined /> 上传文件
                </Button>
                <Button size="small" className="bg-[#21262d] border-[#30363d] text-slate-300 hover:border-[#8b949e] hover:text-white text-xs">
                    <PlusOutlined /> 新建文件
                </Button>
            </div>

            {/* Footer Stats */}
            <div className="px-4 py-2 border-t border-[#30363d] bg-[#161b22] text-[10px] text-slate-500 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MenuOutlined />
                    <span>存储空间: 124KB / 5MB</span>
                </div>
                <Tooltip title="最后保存: 3 分钟前">
                    <div className="flex items-center gap-1 cursor-help">
                        <CloudSyncOutlined /> <span>3m ago</span>
                    </div>
                </Tooltip>
            </div>
        </div>

        {/* Right Editor Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] min-w-0">
            {/* Breadcrumbs & Toolbar */}
            <div className="h-10 border-b border-[#30363d] flex items-center justify-between px-4 bg-[#0d1117]">
                <Breadcrumb 
                    items={breadcrumbPath.map(item => ({ title: <span className="text-slate-400 text-xs">{item}</span> }))}
                    separator={<span className="text-slate-600">/</span>}
                />
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>UTF-8</span>
                    <span>{activeFileLanguage}</span>
                </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    language={activeFileLanguage}
                    theme="vs-dark" // We'll customize this via options or defineTheme if needed
                    value={activeFileContent}
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        renderLineHighlight: 'all',
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                        },
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                    }}
                    onMount={(editor, monaco) => {
                         // Define a custom theme to match the UI better (GitHub Dark dimmed inspired)
                         monaco.editor.defineTheme('custom-dark', {
                            base: 'vs-dark',
                            inherit: true,
                            rules: [
                                { token: 'comment', foreground: '8b949e' },
                                { token: 'keyword', foreground: 'ff7b72' },
                                { token: 'string', foreground: 'a5d6ff' },
                            ],
                            colors: {
                                'editor.background': '#0d1117',
                                'editor.lineHighlightBackground': '#161b22',
                                'editorLineNumber.foreground': '#6e7681',
                                'editorGutter.background': '#0d1117',
                            }
                        });
                        monaco.editor.setTheme('custom-dark');
                    }}
                />
            </div>

            {/* Bottom Action Bar */}
            <div className="h-14 border-t border-[#30363d] bg-[#161b22] px-6 flex items-center justify-end gap-3 shrink-0">
                <Button onClick={() => navigate('/skills')} className="bg-transparent border-[#30363d] text-slate-300 hover:text-white">
                    取消
                </Button>
                <Button 
                    type="primary" 
                    icon={isSaving ? <Spin size="small" /> : <SaveOutlined />} 
                    onClick={handleSave}
                    className="bg-[#238636] border-[#238636] hover:bg-[#2ea043] font-medium px-6"
                >
                    {isSaving ? '保存中...' : '保存并同步'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SkillEditor;
