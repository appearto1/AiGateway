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
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
}

export const getApps = async (name?: string, status?: number | 'all') => {
    const params: any = {};
    if (name) params.name = name;
    if (status !== undefined && status !== 'all') params.status = status;
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
