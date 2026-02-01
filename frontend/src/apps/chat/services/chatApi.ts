import axios from 'axios';

// 独立的对话应用API基础URL
// @ts-ignore
const CHAT_API_BASE_URL = window.CHAT_API_BASE_URL || 'http://127.0.0.1:8088/api';

// 创建独立的 axios 实例用于聊天应用（使用 Bearer token）
const chatAxios = axios.create();

// 请求拦截：从 localStorage 获取 token 并添加到 Authorization header
chatAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('chat_token') || localStorage.getItem('ai_gateway_token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：处理 401 错误
chatAxios.interceptors.response.use(
  (res) => {
    if (res.data?.code === 401) {
      localStorage.removeItem('chat_token');
      localStorage.removeItem('ai_gateway_token');
      // 可以在这里添加跳转登录的逻辑
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401 || err.response?.data?.code === 401) {
      localStorage.removeItem('chat_token');
      localStorage.removeItem('ai_gateway_token');
    }
    return Promise.reject(err);
  }
);

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
}

// 登录接口（不需要 token，使用普通 axios）
export const login = async (username: string, password: string) => {
    const response = await axios.post(`${CHAT_API_BASE_URL}/chat/login`, {
        username,
        password
    });
    return response.data;
};

// 获取模型列表（使用带拦截器的 axios 实例）
export const getModels = async (token?: string) => {
    const config: any = {};
    // 如果传入了 token，使用传入的 token，否则拦截器会自动添加
    if (token) {
        config.headers = {
            'Authorization': `Bearer ${token}`
        };
    }
    const response = await chatAxios.get(`${CHAT_API_BASE_URL}/chat/models`, config);
    return response.data;
};

// 流式对话接口（fetch 无法使用拦截器，需要手动添加 token）
export const chatCompletionsStream = async (
    data: ChatCompletionRequest,
    token?: string
): Promise<Response> => {
    // 优先使用传入的 token，否则从 localStorage 获取
    const authToken = token || localStorage.getItem('chat_token') || localStorage.getItem('ai_gateway_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${CHAT_API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            ...data,
            stream: true
        })
    });
    return response;
};

// 获取历史对话列表（使用带拦截器的 axios 实例）
export const getChatHistory = async (token?: string) => {
    const config: any = {};
    if (token) {
        config.headers = {
            'Authorization': `Bearer ${token}`
        };
    }
    const response = await chatAxios.get(`${CHAT_API_BASE_URL}/chat/history`, config);
    return response.data;
};

// 保存对话（使用带拦截器的 axios 实例）
export const saveChat = async (title: string, messages: ChatMessage[], token?: string) => {
    const config: any = {};
    if (token) {
        config.headers = {
            'Authorization': `Bearer ${token}`
        };
    }
    const response = await chatAxios.post(`${CHAT_API_BASE_URL}/chat/save`, {
        title,
        messages
    }, config);
    return response.data;
};

// 删除对话（使用带拦截器的 axios 实例）
export const deleteChat = async (chatId: string, token?: string) => {
    const config: any = {};
    if (token) {
        config.headers = {
            'Authorization': `Bearer ${token}`
        };
    }
    const response = await chatAxios.delete(`${CHAT_API_BASE_URL}/chat/${chatId}`, config);
    return response.data;
};
