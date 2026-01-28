import axios from 'axios';

// 独立的对话应用API基础URL
// @ts-ignore
const CHAT_API_BASE_URL = window.CHAT_API_BASE_URL || 'http://127.0.0.1:8088/api';

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

// 登录接口
export const login = async (username: string, password: string) => {
    const response = await axios.post(`${CHAT_API_BASE_URL}/chat/login`, {
        username,
        password
    });
    return response.data;
};

// 获取模型列表
export const getModels = async (token: string) => {
    const response = await axios.get(`${CHAT_API_BASE_URL}/chat/models`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

// 流式对话接口
export const chatCompletionsStream = async (
    data: ChatCompletionRequest,
    token: string
): Promise<Response> => {
    const response = await fetch(`${CHAT_API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            ...data,
            stream: true
        })
    });
    return response;
};

// 获取历史对话列表
export const getChatHistory = async (token: string) => {
    const response = await axios.get(`${CHAT_API_BASE_URL}/chat/history`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

// 保存对话
export const saveChat = async (token: string, title: string, messages: ChatMessage[]) => {
    const response = await axios.post(`${CHAT_API_BASE_URL}/chat/save`, {
        title,
        messages
    }, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

// 删除对话
export const deleteChat = async (token: string, chatId: string) => {
    const response = await axios.delete(`${CHAT_API_BASE_URL}/chat/${chatId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};
