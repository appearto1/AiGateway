import axios from 'axios';

// 设置 API_BASE_URL（如果还没有设置）
// @ts-ignore
if (!window.API_BASE_URL) {
    // @ts-ignore
    window.API_BASE_URL = 'http://127.0.0.1:8088/api';
}

// @ts-ignore
const BASE_URL = window.API_BASE_URL || 'http://192.168.120.99:8088/api';

export const API_BASE_URL = `${BASE_URL}/web`;
export const OPENAI_BASE_URL = `${BASE_URL}/v1`;
/** 用于聊天附件等静态资源链接的 origin（与 API 同源） */
export const API_ORIGIN = (() => { try { return new URL(BASE_URL).origin; } catch { return typeof window !== 'undefined' ? window.location.origin : ''; } })();

// 请求拦截：为需要登录的接口附加 X-Token（与 auth.ts 中 AUTH_TOKEN_KEY 一致）
const AUTH_TOKEN_KEY = 'ai_gateway_token';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.set('X-Token', token);
  }
  return config;
});

// 响应拦截：401 时清除 token 并跳转登录（兼容后端返回 HTTP 200 但 body.code=401 的情况）
function clearTokenAndRedirectToLogin(url?: string) {
  if (url?.includes('/user/login') || url?.includes('/auth/public_key')) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('ai_gateway_user');
  window.location.href = `${window.location.origin}/login`;
}

axios.interceptors.response.use(
  (res) => {
    if (res.data?.code === 401) {
      clearTokenAndRedirectToLogin(res.config?.url);
      return Promise.reject(new Error(res.data?.msg || '请重新登录'));
    }
    return res;
  },
  (err) => {
    if (err.response?.data?.code === 401 || err.response?.status === 401) {
      clearTokenAndRedirectToLogin(err.config?.url);
    }
    return Promise.reject(err);
  }
);

export interface ModelProvider {
    id: string;
    name: string;
    icon: string;
    status: 0 | 1 | 2; // 0:正常, 1:异常, 2:禁用
    description: string;
    models: string; // JSON string from backend
    base_url: string;
    api_key: string;
    icon_bg: string;
    latency: string;
    success_rate: string;
    error_rate: string;
    today_tokens: number;
    total_tokens: number;
    tenant_id?: string;
    tenant_name?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | any[];
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
}

export const getModelProviders = async (name?: string, status?: number) => {
    const params: any = {};
    if (name) params.name = name;
    if (status !== undefined) params.status = status;
    const response = await axios.get(`${API_BASE_URL}/provider/list`, { params });
    return response.data;
};

export const createModelProvider = async (data: Partial<ModelProvider>) => {
    const response = await axios.post(`${API_BASE_URL}/provider/add`, data);
    return response.data;
};

export const updateModelProvider = async (data: Partial<ModelProvider>) => {
    const response = await axios.post(`${API_BASE_URL}/provider/update`, data);
    return response.data;
};

export const deleteModelProvider = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/provider/delete`, { id });
    return response.data;
};

export const testProviderConnection = async (baseUrl: string, apiKey: string, onlyCheck: boolean = true) => {
    const response = await axios.post(`${API_BASE_URL}/provider/test_connection`, {
        base_url: baseUrl,
        api_key: apiKey,
        only_check: onlyCheck
    });
    return response.data;
};

export const getModelProviderStats = async () => {
    const response = await axios.get(`${API_BASE_URL}/provider/stats`);
    return response.data;
};

export const getOpenAIModels = async (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await axios.get(`${OPENAI_BASE_URL}/models`, { headers });
    return response.data;
};

export const chatCompletions = async (data: ChatCompletionRequest, providerId?: string) => {
    const headers: Record<string, string> = {};
    if (providerId) {
        headers['X-Provider-Id'] = providerId;
    }
    
    const response = await axios.post(`${OPENAI_BASE_URL}/chat/completions`, data, {
        headers,
        responseType: data.stream ? 'stream' : 'json'
    });
    return response.data;
};

/**
 * 流式聊天补全请求
 * @param data 聊天请求数据
 * @param token 认证令牌
 * @param providerId 可选的提供商ID
 * @returns 返回 Response 对象，用于流式读取
 */
export const chatCompletionsStream = async (
    data: ChatCompletionRequest, 
    token?: string,
    providerId?: string
): Promise<Response> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    // 优先使用传入的 token，否则从 localStorage 获取
    const authToken = token || localStorage.getItem(AUTH_TOKEN_KEY);
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (providerId) {
        headers['X-Provider-Id'] = providerId;
    }
    
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            ...data,
            stream: true
        })
    });
    
    return response;
};

/**
 * AI 助手专用流式对话：走 /api/web/chat/completions，使用用户 token + 租户聊天应用配置，不复用 v1 模型测试接口。
 * 若无 session_id 可传空，后端会自动新建会话并在响应头返回 X-Chat-Session-Id。
 * @param data 聊天请求（model、messages 等，图片和文件内容需在 messages 中）
 * @param sessionId 当前会话 id，可选；无则后端自动新建
 * @returns Response，可读流与 response.headers.get('X-Chat-Session-Id')
 */
export const chatCompletionsStreamAssistant = async (
    data: ChatCompletionRequest,
    sessionId?: string | null
): Promise<Response> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        headers['X-Token'] = token;
    }
    if (sessionId) {
        headers['X-Chat-Session-Id'] = sessionId;
    }
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            ...data,
            stream: true,
        }),
    });
    return response;
};

export interface AppData {
    id: string;
    name: string;
    description: string;
    app_secret: string;
    status: 0 | 1; // 0:正常, 1:禁用
    token_limit: number;
    daily_token_limit: number;
    qps_limit: number;
    today_tokens: number;
    total_tokens: number;
    avatar_text: string;
    avatar_bg: string;
    updatedTime: string;
    model_config: string;
    kb_config: string;
    mcp_config: string;
    tenant_id?: string;
    tenant_name?: string;
}

/** scope=tenant 时仅返回当前租户的应用（用于系统配置-聊天应用等） */
export const getApps = async (name?: string, status?: number | 'all', options?: { scope?: 'tenant' }) => {
    const params: any = {};
    if (name) params.name = name;
    if (status !== undefined && status !== 'all') params.status = status;
    if (options?.scope === 'tenant') params.scope = 'tenant';
    const response = await axios.get(`${API_BASE_URL}/app/list`, { params });
    return response.data;
};

export const createApp = async (data: Partial<AppData>) => {
    const response = await axios.post(`${API_BASE_URL}/app/add`, data);
    return response.data;
};

export const updateApp = async (data: Partial<AppData>) => {
    const response = await axios.post(`${API_BASE_URL}/app/update`, data);
    return response.data;
};

export const rotateAppSecret = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/app/rotate_secret`, { id });
    return response.data;
};

export const deleteApp = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/app/delete`, { id });
    return response.data;
};

// 应用授权（个人/部门/租户）
export type AppAuthTargetType = 'user' | 'department' | 'tenant';

export interface AppAuthorizationItem {
    id: string;
    app_id: string;
    target_type: AppAuthTargetType;
    target_id: string;
    target_name: string;
    created_time: string;
}

export const getAppAuthorizations = async (appId: string) => {
    const response = await axios.get(`${API_BASE_URL}/app/authorization/list`, { params: { app_id: appId } });
    return response.data;
};

export const addAppAuthorization = async (params: { app_id: string; target_type: AppAuthTargetType; target_id: string }) => {
    const response = await axios.post(`${API_BASE_URL}/app/authorization/add`, params);
    return response.data;
};

export const deleteAppAuthorization = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/app/authorization/delete`, { id });
    return response.data;
};

// 应用使用统计相关接口
export interface AppUsageStatsByModel {
    model: string;
    provider_name: string;
    request_count: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    success_count: number;
    error_count: number;
}

export interface AppUsageStatsByApp {
    app_id: string;
    app_name: string;
    request_count: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    success_count: number;
    error_count: number;
}

export interface AppUsageLogItem {
    id: string;
    app_id: string;
    app_name: string;
    tenant_id?: string;
    tenant_name?: string;
    model: string;
    provider_name: string;
    request_id: string;
    status: number;
    status_message: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    request_time: string;
}

export interface AppUsageLogsResponse {
    list: AppUsageLogItem[];
    total: number;
    page: number;
    page_size: number;
}

export interface AppUsageStatsParams {
    app_id?: string;
    tenant_id?: string;
    model?: string;
    request_id?: string;
    start_time?: string;
    end_time?: string;
    page?: number;
    page_size?: number;
}

// 按模型统计应用使用情况
export const getAppUsageStatsByModel = async (params?: AppUsageStatsParams) => {
    const response = await axios.get(`${API_BASE_URL}/app/usage_stats/by_model`, { params });
    return response.data;
};

// 按应用统计使用情况
export const getAppUsageStatsByApp = async (params?: AppUsageStatsParams) => {
    const response = await axios.get(`${API_BASE_URL}/app/usage_stats/by_app`, { params });
    return response.data;
};

// 获取应用使用记录列表
export const getAppUsageLogs = async (params?: AppUsageStatsParams) => {
    const response = await axios.get(`${API_BASE_URL}/app/usage_stats/logs`, { params });
    return response.data;
};

// 获取指定应用的模型使用统计
export const getAppModelStats = async (appId: string, params?: Omit<AppUsageStatsParams, 'app_id'>) => {
    const response = await axios.get(`${API_BASE_URL}/app/usage_stats/model_stats`, { 
        params: { ...params, app_id: appId } 
    });
    return response.data;
};

// 获取请求趋势
export const getRequestTrend = async (params?: AppUsageStatsParams) => {
    const response = await axios.get(`${API_BASE_URL}/app/usage_stats/trend`, { params });
    return response.data;
};

// Knowledge Base API
export interface KnowledgeLibrary {
    id: string;
    name: string;
    description: string;
    icon: string;
    count: number;
}

export interface KnowledgeSkill {
    id: string;
    libraryId: string;
    title: string;
    skillId: string;
    description: string;
    type: string;
}

export const getKnowledgeLibraries = async () => {
    const response = await axios.get(`${API_BASE_URL}/kb/libraries`);
    return response.data;
};

export const getKnowledgeSkills = async (libraryId?: string) => {
    const params: any = {};
    if (libraryId) params.libraryId = libraryId;
    const response = await axios.get(`${API_BASE_URL}/kb/skills`, { params });
    return response.data;
};

export const getKBForApp = async () => {
    const response = await axios.get(`${API_BASE_URL}/app/kb_data`);
    return response.data;
};

export const createLibrary = async (data: { name: string; description?: string }) => {
    const response = await axios.post(`${API_BASE_URL}/kb/library/add`, data);
    return response.data;
};

export const updateLibrary = async (data: { id: string; name?: string; description?: string; modelConfig?: string }) => {
    const response = await axios.post(`${API_BASE_URL}/kb/library/update`, data);
    return response.data;
};

export const deleteLibrary = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/kb/library/delete`, { id });
    return response.data;
};

export const createSkill = async (data: any) => {
    const response = await axios.post(`${API_BASE_URL}/kb/skill/add`, data);
    return response.data;
};

export const updateSkill = async (data: any) => {
    const response = await axios.post(`${API_BASE_URL}/kb/skill/update`, data);
    return response.data;
};

export const deleteSkill = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/kb/skill/delete`, { id });
    return response.data;
};

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// MCP API
export interface McpServer {
    id: string;
    name: string;
    type: 'stdio' | 'sse' | 'streamable_http';
    command: string;
    args: string; // JSON string
    env: string; // JSON string
    url: string;
    description: string;
    status: string;
    version: string;
    icon: string;
    tenant_id?: string;
    tenant_name?: string;
    created_time?: string;
}

export const getMcpServers = async (name?: string, type?: string) => {
    const params: any = {};
    if (name) params.name = name;
    if (type) params.type = type;
    const response = await axios.get(`${API_BASE_URL}/mcp/list`, { params });
    return response.data;
};

export const createMcpServer = async (data: Partial<McpServer>) => {
    const response = await axios.post(`${API_BASE_URL}/mcp/add`, data);
    return response.data;
};

export const updateMcpServer = async (data: Partial<McpServer>) => {
    const response = await axios.post(`${API_BASE_URL}/mcp/update`, data);
    return response.data;
};

export const deleteMcpServer = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/mcp/delete`, { id });
    return response.data;
};

export const inspectMcpServer = async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/mcp/inspect/${id}`);
    return response.data;
};

export const executeMcpTool = async (serverId: string, toolName: string, args: any) => {
    const response = await axios.post(`${API_BASE_URL}/mcp/execute`, {
        server_id: serverId,
        tool_name: toolName,
        arguments: args
    });
    return response.data;
};

// Org API
export interface OrgData {
    id: string;
    name: string;
    en_name: string;
    parent_id: string;
    manager: string;
    quota_total: number;
    quota_used: number;
    quota_unit: string;
    status: number;
    sort_order: number;
    member_count?: number;
    children?: OrgData[];
}

export const getOrgList = async (name?: string) => {
    const params: any = {};
    if (name) params.name = name;
    const response = await axios.get(`${API_BASE_URL}/org/list`, { params });
    return response.data;
};

/** 获取组织树（权限过滤，用于用户管理左侧部门树等） */
export const getOrgTree = async () => {
    const response = await axios.get(`${API_BASE_URL}/org/tree`);
    return response.data;
};

export const createOrg = async (data: Partial<OrgData>) => {
    const response = await axios.post(`${API_BASE_URL}/org/add`, data);
    return response.data;
};

export const updateOrg = async (data: Partial<OrgData>) => {
    const response = await axios.post(`${API_BASE_URL}/org/update`, data);
    return response.data;
};

export const deleteOrg = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/org/delete`, { id });
    return response.data;
};

// Menu API
export type MenuData = {
    id: string;
    name: string;
    type: 'directory' | 'menu' | 'button';
    path?: string;
    permission?: string;
    api_method?: string;
    api_path?: string;
    parent_id?: string;
    icon?: string;
    sort?: number;
    status?: number;
    /** 是否在侧栏显示，0=不显示（仅权限）1=显示，仅 directory/menu 有效 */
    show_in_menu?: number;
    children?: MenuData[];
}

export const getMenuList = async (name?: string) => {
    const params: any = {};
    if (name) params.name = name;
    const response = await axios.get(`${API_BASE_URL}/menu/list`, { params });
    return response.data;
};

export const createMenu = async (data: Partial<MenuData>) => {
    const response = await axios.post(`${API_BASE_URL}/menu/add`, data);
    return response.data;
};

export const updateMenu = async (data: Partial<MenuData>) => {
    const response = await axios.post(`${API_BASE_URL}/menu/update`, data);
    return response.data;
};

export const deleteMenu = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/menu/delete`, { id });
    return response.data;
};

// Role API
export type RoleData = {
    id: string;
    name: string;
    description: string;
    is_system: number;
    status: number;
    tenant_id?: string;
    tenant_name?: string;
    menus?: MenuData[];
    menu_ids?: string[];
}

export const getRoleList = async (name?: string) => {
    const params: any = {};
    if (name) params.name = name;
    const response = await axios.get(`${API_BASE_URL}/role/list`, { params });
    return response.data;
};

export const createRole = async (data: Partial<RoleData>) => {
    const response = await axios.post(`${API_BASE_URL}/role/add`, data);
    return response.data;
};

export const updateRole = async (data: Partial<RoleData>) => {
    const response = await axios.post(`${API_BASE_URL}/role/update`, data);
    return response.data;
};

export const deleteRole = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/role/delete`, { id });
    return response.data;
};

// 简化的菜单选项类型（仅用于角色权限分配）
export type MenuOption = {
    id: string;
    name: string;
    children?: MenuOption[];
}

// 获取菜单选项（仅返回 id 和 name，用于角色管理）
export const getMenuOptions = async () => {
    const response = await axios.get(`${API_BASE_URL}/role/menu_options`);
    return response.data;
};

/** 当前用户可用的菜单树（根据角色组合的菜单并集，仅 directory + menu，用于侧栏） */
export interface UserMenuItem {
    id: string;
    name: string;
    type: 'directory' | 'menu';
    path?: string;
    permission?: string;
    icon?: string;
    sort?: number;
    parent_id?: string;
    children?: UserMenuItem[];
}

/** 获取当前用户菜单树（登录后根据角色显示） */
export const getCurrentUserMenus = async (): Promise<{ code: number; msg?: string; data?: { menus?: UserMenuItem[]; allowed_paths?: string[] } }> => {
    const response = await axios.get<{ code: number; msg?: string; data?: { menus?: UserMenuItem[]; allowed_paths?: string[] } }>(`${API_BASE_URL}/user/menus`);
    return response.data;
};

// 登录日志
export interface LoginLogItem {
    id: number;
    user_id: string;
    login_admin: string;
    user_nick: string;
    log_content: string;
    last_login_ip: string;
    browser?: string;
    last_login_time: string;
    status: number; // 0 成功 1 失败
    tenant_name?: string; // 租户名称
}

export const getLoginLogList = async (params: {
    keyword?: string;
    status?: number;
    page?: number;
    pageSize?: number;
}) => {
    const response = await axios.get<{ code: number; data?: { list: LoginLogItem[]; total: number }; msg?: string }>(
        `${API_BASE_URL}/login_log/list`,
        { params }
    );
    return response.data;
};

// User API
export interface UserData {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
    phone?: string;
    email: string;
    department_id?: string;
    department_name?: string;
    job_title?: string;
    roles: string[]; // Role IDs
    role_names?: string[];
    status: number; // 1: active, 0: inactive
    created_at: string;
    last_login_at?: string;
}

export const getUserList = async (params: {
    keyword?: string;
    username?: string;
    phone?: string;
    role_id?: string;
    department_id?: string;
    page?: number;
    pageSize?: number;
}) => {
    const response = await axios.get(`${API_BASE_URL}/user/list`, { params });
    return response.data;
};

export const createUser = async (data: Partial<UserData>) => {
    const response = await axios.post(`${API_BASE_URL}/user/add`, data);
    return response.data;
};

export const updateUser = async (data: Partial<UserData>) => {
    const response = await axios.post(`${API_BASE_URL}/user/update`, data);
    return response.data;
};

export const deleteUser = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/user/delete`, { id });
    return response.data;
};

export const batchDeleteUsers = async (ids: string[]) => {
    const response = await axios.post(`${API_BASE_URL}/user/batch_delete`, { ids });
    return response.data;
};

// Config API
export const getSysConfig = async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/config`);
    return response.data;
};

export const updateSysConfig = async (data: { logo?: string; name?: string }) => {
    const response = await axios.post(`${API_BASE_URL}/config/update`, data);
    return response.data;
};

// AI 聊天应用配置（独立接口与表，与站点配置分离）
export const getChatAppConfig = async () => {
    const response = await axios.get(`${API_BASE_URL}/chat_app_config/get`);
    return response.data;
};

export const updateChatAppConfig = async (data: { app_ids: string[] }) => {
    const response = await axios.post(`${API_BASE_URL}/chat_app_config/update`, data);
    return response.data;
};

// Chat API
export interface ChatSession {
    id: string;
    title: string;
    app_id?: string;
    updated_time?: string;
}

export interface ChatMessageItem {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    thinking?: string;
    created_time?: string;
}

export const createChatSession = async (title: string, appId?: string) => {
    const response = await axios.post(`${API_BASE_URL}/chat/session`, { title, app_id: appId });
    return response.data;
};

export const deleteChatSession = async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/chat/session`, { data: { id } }); // DELETE with body needs 'data'
    return response.data;
};

export const getChatHistory = async (page: number = 1, pageSize: number = 20) => {
    const response = await axios.get(`${API_BASE_URL}/chat/history`, { params: { page, page_size: pageSize } });
    return response.data;
};

export const getChatMessages = async (sessionId: string) => {
    const response = await axios.get(`${API_BASE_URL}/chat/messages`, { params: { session_id: sessionId } });
    return response.data;
};

export const saveChatMessage = async (data: { session_id: string; role: string; content: string; thinking?: string; meta?: string }) => {
    const response = await axios.post(`${API_BASE_URL}/chat/message`, data);
    return response.data;
};

export const getChatModels = async () => {
    const response = await axios.get(`${API_BASE_URL}/chat/models`);
    return response.data;
};

/** 聊天上传：图片或文件(txt/pdf/word)，文件会解析后返回 content 供上下文 */
export interface ChatFileItem {
    url: string;
    file_name: string;
    file_type: string;
    content?: string;
}
export const uploadChatFile = async (files: File | File[]): Promise<{ code: number; msg?: string; data?: ChatFileItem[] }> => {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : [files];
    list.forEach(f => formData.append('files', f));
    const response = await axios.post(`${API_BASE_URL}/chat/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};
