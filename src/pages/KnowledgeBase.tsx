import React, { useState } from 'react';
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
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Input, Button, Tag, Modal, Upload, message, Tooltip } from 'antd';

const { Dragger } = Upload;
const { TextArea } = Input;

interface Skill {
  id: string;
  title: string;
  skillId: string;
  description: string;
  status: 'published' | 'draft' | 'generating';
  type: 'manual' | 'policy' | 'troubleshoot';
  createdAt: string;
}

interface Library {
  id: string;
  name: string;
  description?: string;
  count: number;
  icon: React.ReactNode;
}

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedLibraryId, setSelectedLibraryId] = useState('manual');
  
  // Library State
  const [libraries, setLibraries] = useState<Library[]>([
    { id: 'manual', name: '产品使用手册', count: 12, icon: <BookOutlined /> },
    { id: 'compliance', name: '合规法务文档', count: 5, icon: <SafetyCertificateOutlined /> },
    { id: 'specs', name: '内部技术规范', count: 8, icon: <FileTextOutlined /> },
  ]);
  
  // Library Modal State
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryModalMode, setLibraryModalMode] = useState<'create' | 'edit'>('create');
  const [libraryForm, setLibraryForm] = useState({ name: '', description: '' });

  // Skill Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'regenerate'>('create');
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [description, setDescription] = useState('');

  const [skills, setSkills] = useState<Skill[]>([
    {
      id: '1',
      title: '产品规格查询',
      skillId: 'get_product_specs',
      description: '当用户询问关于机器人具体硬件参数（如电机功率、传感器精度）时，使用此工具查找。必须优先从提供的知识内容中提取数据...',
      status: 'published',
      type: 'manual',
      createdAt: '2026-01-15'
    },
    {
      id: '2',
      title: '故障排查引导',
      skillId: 'troubleshooting_guide',
      description: '引导用户完成错误代码 E-102 的排查流程。如果用户提到的错误代码不在列表中，请通过 get_manual 工具尝试搜索更多内容...',
      status: 'generating',
      type: 'troubleshoot',
      createdAt: '2026-01-20'
    },
    {
      id: '3',
      title: '售后政策解答',
      skillId: 'after_sales_policy',
      description: '针对退换货、保修期限等问题，查阅知识库中的政策条款并给出回答。回答时需注明的政策版本号和生效日期...',
      status: 'published',
      type: 'policy',
      createdAt: '2026-01-22'
    }
  ]);

  // Library Handlers
  const handleLibraryModalSubmit = () => {
    if (!libraryForm.name) {
      message.error('请输入知识库名称');
      return;
    }

    if (libraryModalMode === 'create') {
      const newLib: Library = {
        id: `lib-${Date.now()}`,
        name: libraryForm.name,
        description: libraryForm.description,
        count: 0,
        icon: <BookOutlined /> // Default icon
      };
      setLibraries([...libraries, newLib]);
      message.success('知识库创建成功');
    } else {
      setLibraries(libraries.map(lib => 
        lib.id === selectedLibraryId 
          ? { ...lib, name: libraryForm.name, description: libraryForm.description }
          : lib
      ));
      message.success('知识库更新成功');
    }
    setIsLibraryModalOpen(false);
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
      onOk() {
        const newLibs = libraries.filter(l => l.id !== selectedLibraryId);
        setLibraries(newLibs);
        if (newLibs.length > 0) {
          setSelectedLibraryId(newLibs[0].id);
        } else {
          setSelectedLibraryId('');
        }
        message.success('知识库已删除');
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

  const handleModalSubmit = () => {
    setIsGenerating(true);

    if (modalMode === 'create') {
        const newSkill: Skill = {
            id: `new-${Date.now()}`,
            title: '正在生成新技能...',
            skillId: 'generating...',
            description: description || 'AI 正在解析文档并构建工具定义...',
            status: 'generating',
            type: 'manual',
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        setSkills(prev => [...prev, newSkill]);
        setIsCreateModalOpen(false);
        
        // Simulate generation completion
        setTimeout(() => {
            setIsGenerating(false);
            setSkills(prev => prev.map(s => s.id === newSkill.id ? {
                ...s,
                title: '全新生成的技能',
                skillId: 'new_generated_skill',
                description: description || '这是基于上传文档自动生成的技能描述。',
                status: 'published'
            } : s));
            message.success('技能生成成功');
        }, 3000);
    } else {
        // Regenerate Mode
        if (!currentSkill) return;
        
        // Update existing skill status
        setSkills(prev => prev.map(s => s.id === currentSkill.id ? {
            ...s,
            status: 'generating',
            description: description || s.description
        } : s));
        
        setIsCreateModalOpen(false);

        // Simulate regeneration completion
        setTimeout(() => {
            setIsGenerating(false);
            setSkills(prev => prev.map(s => s.id === currentSkill.id ? {
                ...s,
                status: 'published',
                title: s.title // Keep original title or maybe update it
            } : s));
            message.success('技能重新生成成功');
        }, 3000);
    }
  };

  const openCreateModal = () => {
      setModalMode('create');
      setCurrentSkill(null);
      setDescription('');
      setIsCreateModalOpen(true);
  }

  const openRegenerateModal = (skill: Skill) => {
      setModalMode('regenerate');
      setCurrentSkill(skill);
      setDescription(skill.description);
      setIsCreateModalOpen(true);
  }

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
                本知识库包含公司旗下所有智能硬件产品的核心使用手册与技术规范。
              </p>
              <p className="text-slate-500 text-sm">
                该库已编译为一系列可执行的 Agent 技能。每个技能都包含独立的指令集、知识上下文和工具定义，遵循 Claude Agent Skills 规范。技能一旦更新并发布，关联的智能体将能够通过 Tool Calling 接口即时调用相关知识。
              </p>
            </div>
            <div className="text-right">
              <div className="flex gap-6 text-slate-400 text-sm">
                <div>
                    <span className="block text-xs text-slate-500">关联技能数</span>
                    <span className="text-xl font-bold text-blue-400">12</span>
                </div>
                <div>
                    <span className="block text-xs text-slate-500">更新于</span>
                    <span className="text-xl font-bold text-slate-200">2h 前</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <AppstoreOutlined />
              <span className="font-medium">技能卡片 (3)</span>
            </div>
            <div className="flex gap-2">
               <Button 
                 type={viewMode === 'grid' ? 'primary' : 'text'} 
                 ghost={viewMode === 'grid'}
                 icon={<AppstoreOutlined />} 
                 onClick={() => setViewMode('grid')}
                 className={viewMode !== 'grid' ? 'text-slate-500' : ''}
               />
               <Button 
                 type={viewMode === 'list' ? 'primary' : 'text'} 
                 ghost={viewMode === 'list'}
                 icon={<BarsOutlined />} 
                 onClick={() => setViewMode('list')}
                 className={viewMode !== 'list' ? 'text-slate-500' : ''}
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map(skill => (
              <div key={skill.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-0 hover:border-[#58a6ff] transition-colors group flex flex-col relative">
                <div className="p-5 flex-1 relative">
                  <div className="absolute top-5 right-5">
                    <Tag 
                        color={skill.status === 'published' ? 'success' : skill.status === 'generating' ? 'processing' : 'default'} 
                        className={
                            skill.status === 'published' ? 'bg-[#1a7f37]/15 text-[#2da44e] border-0' : 
                            skill.status === 'generating' ? 'bg-blue-500/15 text-blue-400 border-0' :
                            'bg-[#6e7681]/15 text-[#9198a1] border-0'
                        }
                    >
                        {skill.status === 'published' ? '已发布' : skill.status === 'generating' ? '生成中' : '草稿'}
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
                         disabled={skill.status === 'generating'}
                       />
                     </Tooltip>
                     <Tooltip title="重新生成">
                       <Button 
                         size="small" 
                         type="text"
                         className="text-slate-400 hover:text-blue-400 hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                         icon={<ReloadOutlined spin={skill.status === 'generating'} />}
                         disabled={skill.status === 'generating'}
                         onClick={() => openRegenerateModal(skill)}
                       />
                     </Tooltip>
                     <Tooltip title="删除">
                       <Button 
                         size="small" 
                         type="text"
                         className="text-slate-400 hover:text-red-400 hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                         icon={<DeleteOutlined />}
                         disabled={skill.status === 'generating'}
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
                multiple={false} 
                className="dark-dragger group"
                style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
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
    </div>
  );
};

export default KnowledgeBase;
