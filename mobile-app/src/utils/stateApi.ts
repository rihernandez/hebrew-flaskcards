import { getToken } from './apiClient';

export const STATE_GATEWAY_BASE_URL = 'http://10.0.2.2:3010'; // Android emulator -> localhost
// export const STATE_GATEWAY_BASE_URL = 'http://localhost:3010'; // iOS simulator

export type StateDomain = 'preferences' | 'learning-state' | 'progression-state';

async function requestState<T>(
  domain: StateDomain,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('No auth token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${STATE_GATEWAY_BASE_URL}/${domain}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message ?? `State request failed: ${res.status}`);
  }

  return data as T;
}

export const stateApi = {
  list: <T = Array<{ key: string; value: any; updatedAt?: string }>>(domain: StateDomain) =>
    requestState<T>(domain, ''),

  get: async <T = any>(domain: StateDomain, key: string, fallback: T): Promise<T> => {
    try {
      const data = await requestState<{ key: string; value: T | null }>(domain, `/${encodeURIComponent(key)}`);
      return (data?.value ?? fallback) as T;
    } catch {
      return fallback;
    }
  },

  set: (domain: StateDomain, key: string, value: any) =>
    requestState<{ ok: boolean }>(domain, `/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

  bulkGet: async <T extends Record<string, any>>(domain: StateDomain, keys: string[], fallback: T): Promise<T> => {
    try {
      return await requestState<T>(domain, '/bulk-get', {
        method: 'POST',
        body: JSON.stringify({ keys }),
      });
    } catch {
      return fallback;
    }
  },

  bulkSet: (domain: StateDomain, entries: Array<{ key: string; value: any }>) =>
    requestState<{ ok: boolean; count: number }>(domain, '/bulk-set', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  remove: (domain: StateDomain, key: string) =>
    requestState<{ ok: boolean }>(domain, `/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),

  clear: (domain: StateDomain) =>
    requestState<{ ok: boolean; deleted: number }>(domain, '', {
      method: 'DELETE',
    }),
};
