/**
 * apiClient.ts
 * HTTP client for the auth microservice.
 * Change AUTH_BASE_URL to your deployed URL when ready.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_BASE_URL = 'http://10.0.2.2:3001'; // Android emulator → localhost
// export const AUTH_BASE_URL = 'http://localhost:3001'; // iOS simulator
// export const AUTH_BASE_URL = 'https://your-deployed-url.com'; // production

const TOKEN_KEY = 'auth_token';

export const saveToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${AUTH_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

async function requestWithToken<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${AUTH_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed: ${res.status}`);
  }
  return data as T;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  age: number;
  country: string;
  nativeLanguage: string;
  learningLanguage: string;
  languageLevel: 'beginner' | 'intermediate' | 'advanced';
  notificationHour?: number;
  notificationMinute?: number;
  speakingUnlocked?: boolean;
}

export interface AuthResponse {
  token: string;
  user: RemoteUser;
  mustChangePassword?: boolean;
}

export interface RemoteUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  country: string;
  nativeLanguage: string;
  learningLanguage: string;
  languageLevel: string;
  notificationHour?: number;
  notificationMinute?: number;
  speakingUnlocked?: boolean;
  photo: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  changeTemporaryPassword: (token: string, newPassword: string) =>
    requestWithToken<{ success: boolean; message: string }>(
      token,
      '/auth/change-temporary-password',
      {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      },
    ),

  validate: () => request<{ valid: boolean; user: RemoteUser }>('/auth/validate'),

  me: () => request<RemoteUser>('/auth/me'),

  updateProfile: (data: Partial<RegisterPayload> & { photo?: string }) =>
    request<RemoteUser>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
