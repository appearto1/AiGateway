import axios from 'axios';
import JSEncrypt from 'jsencrypt';
import { API_BASE_URL } from './api';

// 使用统一的 axios 实例（带拦截器）
// 创建一个独立的 axios 实例用于登录相关接口（不需要 token）
const authAxios = axios.create();

const AUTH_TOKEN_KEY = 'ai_gateway_token';
const AUTH_USER_KEY = 'ai_gateway_user';
const REMEMBER_KEY = 'ai_gateway_remember';

export interface LoginUser {
  user_id: string;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  roles?: string[];
  role_names?: string[];
  /** 是否拥有系统类型角色（系统角色可进行菜单等敏感操作的增删改） */
  has_system_role?: boolean;
}

export interface LoginResult {
  token: string;
  user_id: string;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  roles?: string[];
  role_names?: string[];
  has_system_role?: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser(): LoginUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: LoginResult): void {
  const u: LoginUser = {
    user_id: user.user_id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    email: user.email,
    roles: user.roles,
    role_names: user.role_names,
    has_system_role: user.has_system_role,
  };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
}

export function getRemember(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function setRemember(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

/** 获取 RSA 公钥 */
export async function getPublicKey(): Promise<string> {
  const res = await authAxios.get<{ code: number; data?: { public_key: string }; msg: string }>(
    `${API_BASE_URL}/auth/public_key`
  );
  if (res.data?.code !== 200 || !res.data?.data?.public_key) {
    throw new Error(res.data?.msg || '获取公钥失败');
  }
  return res.data.data.public_key;
}

/** 使用公钥加密密码（RSA PKCS#1 v1.5，与后端 DecryptPasswordPKCS1v15 对应） */
export function encryptPassword(publicKeyPem: string, password: string): string {
  const encrypt = new (JSEncrypt as unknown as { new (): { setPublicKey: (k: string) => void; encrypt: (s: string) => string | false } })();
  encrypt.setPublicKey(publicKeyPem);
  const encrypted = encrypt.encrypt(password);
  if (!encrypted) throw new Error('密码加密失败');
  return encrypted;
}

/** 登录：先取公钥再加密密码后提交 */
export async function login(
  username: string,
  password: string
): Promise<{ code: number; msg: string; data?: LoginResult }> {
  const publicKey = await getPublicKey();
  const encryptedPassword = encryptPassword(publicKey, password);
  const res = await authAxios.post<{
    code: number;
    msg: string;
    data?: LoginResult;
  }>(`${API_BASE_URL}/user/login`, {
    username,
    encrypted_password: encryptedPassword,
  });
  return res.data;
}
