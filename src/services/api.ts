import axios from 'axios';

const API_BASE_URL = 'http://localhost:8088/api/web';
const OPENAI_BASE_URL = 'http://localhost:8088/api/v1';

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
    content: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
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

export const getOpenAIModels = async () => {
    const response = await axios.get(`${OPENAI_BASE_URL}/models`);
    return response.data;
};

export const chatCompletions = async (data: ChatCompletionRequest, providerId?: string) => {
    const headers: Record<string, string> = {};
    if (providerId) {
        headers['X-Provider-Id'] = providerId;
    }
    
    // For streaming, we might need a different approach than standard axios.post
    // but for now let's keep it simple or use fetch for streaming support later if needed.
    const response = await axios.post(`${OPENAI_BASE_URL}/chat/completions`, data, {
        headers,
        responseType: data.stream ? 'stream' : 'json'
    });
    return response.data;
};
