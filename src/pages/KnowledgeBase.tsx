import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOutlined, 
  FileTextOutlined, 
  PlusOutlined, 
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  CloudUploadOutlined,
  ThunderboltFilled,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  SyncOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Input, Button, Tag, Modal, Upload, message, Tooltip, Select, Space } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { getOpenAIModels } from '../services/api';

const { Dragger } = Upload;
const { TextArea } = Input;

interface SkillFile {
  id: string;
  name: string;
  url: string;
  storage_name: string;
}

interface Skill {
  id: string;
  title: string;
  skillId: string;
  description: string;
  status: 0 | 1 | 2; // 0: creating, 1: published, 2: failed
  type: 'manual' | 'policy' | 'troubleshoot';
  createdAt: string;
  filesList?: SkillFile[]; // Updated from 'files?: string'
}

interface Library {
  id: string;
  name: string;
  description?: string;
  count: number;
  icon: React.ReactNode;
  modelConfig?: string;
}

import { API_BASE_URL } from '../services/api';

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  
  // Library State
  const [libraries, setLibraries] = useState<Library[]>([]);

  const fetchLibraries = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/kb/libraries`);
        const data = await res.json();
        if (data.code === 200) {
            setLibraries(data.data.map((l: any) => ({
                ...l,
                icon: <BookOutlined /> 
            })));
            if (data.data.length > 0 && !selectedLibraryId) {
                setSelectedLibraryId(data.data[0].id);
            }
        }
    } catch (e) {
        console.error(e);
        message.error('获取知识库列表失败');
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSkills = async (libId: string) => {
    if (!libId) return;
    setIsRefreshing(true);
    try {
        const res = await fetch(`${API_BASE_URL}/kb/skills?libraryId=${libId}`);
        const data = await res.json();
        if (data.code === 200) {
            setSkills(data.data || []);
        }
    } catch (e) {
        console.error(e);
        message.error('获取技能列表失败');
    } finally {
        setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (selectedLibraryId) {
        fetchSkills(selectedLibraryId);
    } else {
        setSkills([]);
    }
  }, [selectedLibraryId]);
  
  // Library Modal State
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryModalMode, setLibraryModalMode] = useState<'create' | 'edit'>('create');
  const [libraryForm, setLibraryForm] = useState({ name: '', description: '' });

  // Skill Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Model Settings State
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [appToken, setAppToken] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchModelsByToken = async (token: string) => {
      if (!token) {
          message.error('请输入应用令牌');
          return;
      }
      try {
          setIsLoadingModels(true);
          const res = await getOpenAIModels(token);
          
          if (res.data && Array.isArray(res.data)) {
              const modelList = res.data.map((m: any) => m.id);
              setAvailableModels(modelList);
              if (modelList.length > 0 && !modelList.includes(selectedModel)) {
                  setSelectedModel(modelList[0]);
              }
              message.success(`成功加载 ${modelList.length} 个授权模型`);
          } else {
              throw new Error('获取授权模型失败：响应数据格式错误');
          }
      } catch (e: any) {
          message.error(e.message || "Token 无效或获取模型失败");
          setAvailableModels([]);
      } finally {
          setIsLoadingModels(false);
      }
  };

  const handleSaveModelConfig = async () => {
      if (!selectedModel) {
          message.error('请选择模型');
          return;
      }
      
      const config = {
          apiKey: appToken,
          model: selectedModel
      };

      try {
        const res = await fetch(`${API_BASE_URL}/kb/library/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedLibraryId,
                modelConfig: JSON.stringify(config)
            })
        });
         const data = await res.json();
        if (data.code === 200) {
             message.success('模型配置已保存');
             fetchLibraries(); // Refresh to update local state
             setIsModelModalOpen(false);
        } else {
             message.error(data.error || '保存失败');
        }
     } catch (e) {
         message.error('保存失败');
     }
  };

  const openModelSettings = () => {
      const lib = libraries.find(l => l.id === selectedLibraryId);
      if (lib && lib.modelConfig) {
          try {
              const config = JSON.parse(lib.modelConfig);
              setAppToken(config.apiKey || '');
              setSelectedModel(config.model || '');
              // If token exists, try to fetch models immediately to populate list
              if (config.apiKey) {
                  fetchModelsByToken(config.apiKey);
              }
          } catch (e) {
              console.error("Failed to parse model config", e);
              setAppToken('');
              setSelectedModel('');
          }
      } else {
          setAppToken('');
          setSelectedModel('');
          setAvailableModels([]);
      }
      setIsModelModalOpen(true);
  }

  const [modalMode, setModalMode] = useState<'create' | 'regenerate'>('create');
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [description, setDescription] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleUpload = async (options: any) => {
    const { onSuccess, onError, file } = options;
    const formData = new FormData();
    formData.append('files', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.code === 200 && result.data && result.data.length > 0) {
        onSuccess(result.data[0]);
        message.success(`${file.name} 上传成功`);
      } else {
        onError(new Error(result.msg || 'Upload failed'));
        message.error(`${file.name} 上传失败`);
      }
    } catch (error) {
      onError(error);
      message.error(`${file.name} 上传出错`);
    }
  };

  const [skills, setSkills] = useState<Skill[]>([]);

  // Library Handlers
  const handleLibraryModalSubmit = async () => {
    if (!libraryForm.name) {
      message.error('请输入知识库名称');
      return;
    }

    if (libraryModalMode === 'create') {
        try {
            const res = await fetch(`${API_BASE_URL}/kb/library/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: libraryForm.name,
                    description: libraryForm.description
                })
            });
            const data = await res.json();
            if (data.code === 200) {
                 message.success('知识库创建成功');
                 fetchLibraries();
                 setIsLibraryModalOpen(false);
            } else {
                message.error(data.error || '创建失败');
            }
        } catch (e) {
             message.error('创建失败');
        }
    } else {
         try {
            const res = await fetch(`${API_BASE_URL}/kb/library/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedLibraryId,
                    name: libraryForm.name,
                    description: libraryForm.description
                })
            });
             const data = await res.json();
            if (data.code === 200) {
                 message.success('知识库更新成功');
                 fetchLibraries();
                 setIsLibraryModalOpen(false);
            } else {
                 message.error(data.error || '更新失败');
            }
         } catch (e) {
             message.error('更新失败');
         }
    }
  };

  const handleDeleteLibrary = () => {
    modal.confirm({
      title: <span className="text-white">确认删除知识库?</span>,
      icon: <ExclamationCircleOutlined style={{ color: '#cf222e' }} />,
      content: <div className="text-slate-300">删除后无法恢复，且该知识库下的所有技能也将被删除。</div>,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'dark-confirm-modal',
      okButtonProps: { className: 'bg-red-600 border-red-600 hover:bg-red-500' },
      cancelButtonProps: { className: 'bg-transparent border-[#30363d] text-slate-300 hover:text-white hover:border-slate-500' },
      onOk: async () => {
          try {
             const res = await fetch(`${API_BASE_URL}/kb/library/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedLibraryId })
            }); 
            const data = await res.json();
            if (data.code === 200) {
                message.success('知识库已删除');
                fetchLibraries();
                setSelectedLibraryId('');
            } else {
                message.error(data.error || '删除失败');
            }
          } catch(e) {
              message.error('删除失败');
          }
      },
    });
  };

  const openLibraryModal = (mode: 'create' | 'edit') => {
    setLibraryModalMode(mode);
    if (mode === 'edit') {
      const currentLib = libraries.find(l => l.id === selectedLibraryId);
      if (currentLib) {
        setLibraryForm({ name: currentLib.name, description: currentLib.description || '' });
      }
    } else {
      setLibraryForm({ name: '', description: '' });
    }
    setIsLibraryModalOpen(true);
  };

  const handleModalSubmit = async () => {
    setIsGenerating(true);

    const filesJson = JSON.stringify(fileList.map(f => ({
        name: f.name,
        url: f.response?.url || f.url,
        storageName: f.response?.storage_name || f.response?.storageName
    })));

    if (modalMode === 'create') {
        try {
             const res = await fetch(`${API_BASE_URL}/kb/skill/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    libraryId: selectedLibraryId,
                    title: '正在生成新技能...', 
                    skillId: `skill-${Date.now()}`,
                    description: description,
                    files: filesJson // Backend parses this string
                })
            });
            const data = await res.json();
            if (data.code === 200) {
                // Poll for status or just wait a bit and refresh
                setTimeout(() => {
                    fetchSkills(selectedLibraryId); 
                    message.success('技能生成任务已提交');
                    setIsGenerating(false);
                }, 1000);
                
                setIsCreateModalOpen(false);
            } else {
                setIsGenerating(false);
                message.error(data.error || '创建失败');
            }
        } catch (e) {
             setIsGenerating(false);
             message.error('创建失败');
        }
    } else {
        if (!currentSkill) return;
        
        // Regenerate Mode - Re-use 'add' logic or update?
        // Since we refactored backend to async generation via 'add' handler mostly,
        // but for update/regenerate, we might need a specific handler if we want to keep the same ID.
        // For now, let's treat regenerate as creating a NEW version or update existing one via a specific API?
        // Actually, the previous code called `kb/skill/update`.
        // BUT my backend `UpdateSkill` logic is simple DB update, not AI generation.
        // `CreateSkillWithAI` handles AI generation.
        // If we want to regenerate, we probably should use `CreateSkillWithAI` logic but targeted at an existing ID.
        // Let's call `kb/skill/add` but with the SAME skillId? 
        // My backend `CreateSkillWithAI` checks `skill_id`. If exists, it UPDATES it.
        // So we can reuse `kb/skill/add` (CreateSkillWithAI) for regeneration!
        
        try {
            await fetch(`${API_BASE_URL}/kb/skill/add`, { // Reuse add for regenerate
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    libraryId: selectedLibraryId,
                    title: currentSkill.title, // Keep title or let AI overwrite? AI overwrites.
                    skillId: currentSkill.skillId, // Keep same ID
                    description: description,
                    files: filesJson
                })
            });
            
            setTimeout(() => {
                fetchSkills(selectedLibraryId);
                message.success('技能重新生成任务已提交');
                setIsGenerating(false);
            }, 1000);

            setIsCreateModalOpen(false);

         } catch (e) {
             setIsGenerating(false);
             message.error('更新失败');
         }
    }
  };

  const openCreateModal = () => {
      setModalMode('create');
      setCurrentSkill(null);
      setDescription('');
      setFileList([]);
      setIsCreateModalOpen(true);
  }

  const openRegenerateModal = (skill: Skill) => {
      setModalMode('regenerate');
      setCurrentSkill(skill);
      setDescription(skill.description);
      
      // Parse files from new structure
      if (skill.filesList && Array.isArray(skill.filesList)) {
          const uploadFiles: UploadFile[] = skill.filesList.map((f, index) => ({
              uid: `-${index}-${Date.now()}`,
              name: f.name,
              status: 'done',
              url: f.url,
              response: { 
                  url: f.url,
                  storage_name: f.storage_name
              }
          }));
          setFileList(uploadFiles);
      } else {
          setFileList([]);
      }

      setIsCreateModalOpen(true);
  }

  const handleDeleteSkill = (skillId: string) => {
    modal.confirm({
      title: <span className="text-white">确认删除技能?</span>,
      icon: <ExclamationCircleOutlined style={{ color: '#cf222e' }} />,
      content: <div className="text-slate-300">删除后无法恢复。</div>,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'dark-confirm-modal',
      okButtonProps: { className: 'bg-red-600 border-red-600 hover:bg-red-500' },
      cancelButtonProps: { className: 'bg-transparent border-[#30363d] text-slate-300 hover:text-white hover:border-slate-500' },
      onOk: async () => {
          try {
             const res = await fetch(`${API_BASE_URL}/kb/skill/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: skillId })
            }); 
            const data = await res.json();
            if (data.code === 200) {
                message.success('技能已删除');
                fetchSkills(selectedLibraryId);
            } else {
                message.error(data.error || '删除失败');
            }
          } catch(e) {
              message.error('删除失败');
          }
      },
    });
  };

  const activeLibrary = libraries.find(l => l.id === selectedLibraryId);

  return (
    <div className="flex h-full bg-[#0d1117]">
      {contextHolder}
      {/* Secondary Sidebar - Library List */}
      <div className="w-64 border-r border-[#233648] flex flex-col bg-[#111a22]">
        <div className="p-4 border-b border-[#233648] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600/20 p-1.5 rounded-md">
                <RobotOutlined className="text-blue-500 text-lg" />
            </div>
            <div>
                <h2 className="text-sm font-bold text-white m-0">Agent Skills</h2>
                <p className="text-xs text-slate-500 m-0">知识库管理</p>
            </div>
          </div>
          <Button 
            type="text" 
            icon={<PlusOutlined className="text-blue-500" />} 
            size="small" 
            onClick={() => openLibraryModal('create')}
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500">知识库列表</div>
          {libraries.map(lib => (
            <div 
              key={lib.id}
              onClick={() => setSelectedLibraryId(lib.id)}
              className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-[#1a2632] transition-colors border-l-2 ${
                selectedLibraryId === lib.id 
                  ? 'border-blue-500 bg-[#1a2632] text-blue-400' 
                  : 'border-transparent text-slate-400'
              }`}
            >
              <span className="text-lg">{lib.icon}</span>
              <span className="text-sm font-medium">{lib.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {/* Header */}
        <div className="p-6 border-b border-[#233648]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
               <h1 className="text-2xl font-bold text-white m-0">{activeLibrary?.name || '未选择知识库'}</h1>
               {activeLibrary && (
                 <div className="flex items-center gap-1">
                   <Tooltip title="编辑知识库信息">
                     <Button 
                       type="text" 
                       size="small" 
                       icon={<EditOutlined />} 
                       className="text-slate-500 hover:text-white"
                       onClick={() => openLibraryModal('edit')}
                     />
                   </Tooltip>
                   <Tooltip title="删除当前知识库">
                     <Button 
                       type="text" 
                       size="small" 
                       icon={<DeleteOutlined />} 
                       className="text-slate-500 hover:text-red-400"
                       onClick={handleDeleteLibrary}
                     />
                   </Tooltip>
                 </div>
               )}
            </div>
            <div className="flex gap-3">
              <Input 
                prefix={<SearchOutlined className="text-slate-500" />} 
                placeholder="搜索技能定义..." 
                className="w-64 bg-[#1a2632] border-[#233648] text-slate-200 placeholder:text-slate-500"
              />
              <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 hover:bg-blue-500" onClick={openCreateModal}>
                创建新技能
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="max-w-3xl">
              <p className="text-slate-400 mb-2">
                {activeLibrary?.description || '暂无描述'}
              </p>
              <p className="text-slate-500 text-sm">
                该库已编译为一系列可执行的 Agent 技能。每个技能都包含独立的指令集、知识上下文和工具定义，遵循 Claude Agent Skills 规范。技能一旦更新并发布，关联的智能体将能够通过 Tool Calling 接口即时调用相关知识。
              </p>
            </div>
            <div className="text-right">
              <div className="flex gap-6 text-slate-400 text-sm">
                {activeLibrary && (
                    <Tooltip title="配置模型设置">
                        <Button 
                            type="text" 
                            icon={<SettingOutlined className="text-xl" />} 
                            className="text-slate-400 hover:text-blue-400 flex items-center justify-center h-auto p-2"
                            onClick={openModelSettings}
                        />
                    </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <AppstoreOutlined />
              <span className="font-medium">技能卡片 ({skills.length})</span>
            </div>
            <div className="flex gap-2">
               <Tooltip title="刷新列表">
                   <Button 
                     type="text" 
                     icon={<ReloadOutlined spin={isRefreshing} />} 
                     onClick={() => fetchSkills(selectedLibraryId)}
                     className="text-slate-500 hover:text-blue-400"
                   />
               </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map(skill => (
              <div key={skill.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-0 hover:border-[#58a6ff] transition-colors group flex flex-col relative">
                <div className="p-5 flex-1 relative">
                  <div className="absolute top-5 right-5">
                    <Tag 
                        color={skill.status === 1 ? 'success' : skill.status === 0 ? 'processing' : 'error'} 
                        className={
                            skill.status === 1 ? 'bg-[#1a7f37]/15 text-[#2da44e] border-0' : 
                            skill.status === 0 ? 'bg-blue-500/15 text-blue-400 border-0' :
                            'bg-red-500/15 text-red-400 border-0'
                        }
                    >
                        {skill.status === 1 ? '已发布' : skill.status === 0 ? '生成中' : '生成失败'}
                    </Tag>
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-200 mb-1 pr-16 mt-0.5">{skill.title}</h3>
                  <div className="text-xs font-mono text-slate-500 mb-4">ID: {skill.skillId}</div>
                  
                  <div className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">指令预览 (INSTRUCTION)</div>
                  <div className="bg-[#0d1117] p-3 rounded border border-[#233648] text-slate-400 text-xs italic font-mono leading-relaxed line-clamp-3">
                    "{skill.description}"
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#30363d] flex justify-between items-center bg-[#161b22]/50">
                   <div className="text-xs text-slate-500 font-mono">
                     Created: {skill.createdAt}
                   </div>
                   <div className="flex gap-1">
                     <Tooltip title="编辑">
                       <Button 
                         size="small" 
                         type="text"
                         className="text-slate-400 hover:text-white hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                         icon={<EditOutlined />}
                         onClick={() => navigate(`/skills/${skill.id}`)}
                         disabled={skill.status === 0}
                       />
                     </Tooltip>
                     <Tooltip title="重新生成">
                       <Button 
                         size="small" 
                         type="text"
                         className="text-slate-400 hover:text-blue-400 hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                         icon={<ReloadOutlined spin={skill.status === 0} />}
                         disabled={skill.status === 0}
                         onClick={() => openRegenerateModal(skill)}
                       />
                     </Tooltip>
                     <Tooltip title="删除">
                       <Button 
                         size="small" 
                         type="text"
                         className="text-slate-400 hover:text-red-400 hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                         icon={<DeleteOutlined />}
                         disabled={skill.status === 0}
                         onClick={() => handleDeleteSkill(skill.id)}
                       />
                     </Tooltip>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Library Modal */}
      <Modal
        title={
            <div className="text-white font-bold text-lg mb-1">
                {libraryModalMode === 'create' ? '新建知识库' : '编辑知识库'}
            </div>
        }
        open={isLibraryModalOpen}
        onCancel={() => setIsLibraryModalOpen(false)}
        onOk={handleLibraryModalSubmit}
        okText="确认"
        cancelText="取消"
        width={500}
        className="dark-modal"
        styles={{ 
            content: { backgroundColor: '#0d1117', border: '1px solid #30363d' }, 
            header: { backgroundColor: '#0d1117', borderBottom: 'none', paddingBottom: 0 },
            body: { padding: '24px' } 
        } as any}
        closeIcon={<span className="text-slate-400 hover:text-white">×</span>}
        centered
      >
        <div className="space-y-4">
            <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">知识库名称</div>
                <Input 
                    placeholder="例如：产品技术手册" 
                    value={libraryForm.name}
                    onChange={e => setLibraryForm({...libraryForm, name: e.target.value})}
                    className="bg-[#161b22] border-[#30363d] text-slate-200 placeholder:text-slate-600"
                />
            </div>
            <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">描述</div>
                <TextArea 
                    placeholder="简要描述该知识库的用途..." 
                    rows={3}
                    value={libraryForm.description}
                    onChange={e => setLibraryForm({...libraryForm, description: e.target.value})}
                    className="bg-[#161b22] border-[#30363d] text-slate-200 placeholder:text-slate-600"
                />
            </div>
        </div>
      </Modal>

      {/* Create/Regenerate Skill Modal */}
      <Modal
        title={
            <div className="text-white font-bold text-lg mb-1">
                {modalMode === 'create' ? '上传文档并自动生成技能' : `重新生成技能 (ID: ${currentSkill?.skillId})`}
            </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={600}
        className="dark-modal"
        styles={{ 
            content: { backgroundColor: '#0d1117', border: '1px solid #30363d' }, 
            header: { backgroundColor: '#0d1117', borderBottom: 'none', paddingBottom: 0 },
            body: { padding: '24px' } 
        } as any}
        closeIcon={<span className="text-slate-400 hover:text-white">×</span>}
        centered
      >
        <div className="text-slate-400 text-sm mb-6">
            支持 PDF, Word 或 Markdown。AI 将根据您的描述自动提取核心知识并生成符合规范的工具定义。
        </div>

        <div className="mb-6">
            <style>{`
                .dark-dragger .ant-upload.ant-upload-drag {
                    background-color: #161b22 !important;
                    border-color: #30363d !important;
                }
                .dark-dragger .ant-upload.ant-upload-drag:hover {
                    border-color: #137fec !important;
                }
            `}</style>
            <Dragger 
                multiple={true} 
                className="dark-dragger group"
                style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
                fileList={fileList}
                customRequest={handleUpload}
                onChange={({ fileList }) => setFileList(fileList)}
                onRemove={(file) => {
                    setFileList(prev => prev.filter(item => item.uid !== file.uid));
                }}
            >
                <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined className="text-slate-500 text-4xl group-hover:text-blue-500 transition-colors" />
                </p>
                <p className="text-slate-300 font-medium mt-4">
                    点击或拖拽文件至此处上传
                </p>
                <p className="text-slate-500 text-xs mt-1">
                    文件大小上限 20MB
                </p>
            </Dragger>
        </div>

        <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <FileTextOutlined /> 技能用途描述 (必填)
            </div>
            <TextArea 
                rows={4} 
                placeholder="请描述此文件的用途，例如：这份文档是XX产品的售后政策，请基于此生成一个查询退换货流程的技能。"
                className="bg-[#161b22] border-[#30363d] text-slate-200 placeholder:text-slate-600 focus:bg-[#161b22] focus:border-blue-500 hover:bg-[#161b22] hover:border-[#30363d]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            <div className="mt-2 text-[10px] text-slate-600">
                此描述将帮助 AI 更好地理解文档背景，系统将自动完成建模、Schema 生成与内容提取。
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
            <Button 
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-[#161b22]"
            >
                取消
            </Button>
            <Button 
                type="primary" 
                icon={<ThunderboltFilled />} 
                loading={isGenerating}
                onClick={handleModalSubmit}
                className="bg-blue-600 border-blue-600 hover:bg-blue-500 font-medium px-6"
            >
                {modalMode === 'create' ? '开始生成' : '开始重新生成'}
            </Button>
        </div>
      </Modal>

      {/* Model Settings Modal */}
      <Modal
        title={
            <div className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                <SettingOutlined />
                <span>知识库模型设置</span>
            </div>
        }
        open={isModelModalOpen}
        onCancel={() => setIsModelModalOpen(false)}
        onOk={handleSaveModelConfig}
        okText="保存配置"
        cancelText="取消"
        width={500}
        className="dark-modal"
        styles={{ 
            content: { backgroundColor: '#0d1117', border: '1px solid #30363d' }, 
            header: { backgroundColor: '#0d1117', borderBottom: 'none', paddingBottom: 0 },
            body: { padding: '24px' } 
        } as any}
        closeIcon={<span className="text-slate-400 hover:text-white">×</span>}
        centered
      >
        <div className="space-y-6">
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
                  className="bg-[#161b22] border-[#30363d] text-white placeholder:text-slate-600"
                />
                <Button 
                    type="primary" 
                    icon={<SyncOutlined spin={isLoadingModels} />} 
                    onClick={() => fetchModelsByToken(appToken)}
                    className="bg-blue-600 border-blue-600 hover:bg-blue-500"
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
                style={{ backgroundColor: '#161b22' }}
                dropdownStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
              />
            </div>
            
            <div className="bg-[#161b22] p-3 rounded border border-[#30363d] text-xs text-slate-400">
                <InfoCircleOutlined className="mr-2 text-blue-500" />
                此配置将用于该知识库的所有生成任务（如技能生成、RAG 检索增强生成等）。
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
