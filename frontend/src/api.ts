export type ApiOptions = RequestInit & { auth?: boolean };

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '')
).replace(/\/$/, '');
const TOKEN_KEY = 'coaching.accessToken';
const USER_KEY = 'coaching.user';

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  isPlatformAdmin?: boolean;
  sessionId?: string;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}
export function saveSession(value: { accessToken: string; user: SessionUser }) {
  localStorage.setItem(TOKEN_KEY, value.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(value.user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const get = <T>(path: string, options?: ApiOptions) =>
  api<T>(path, options);
export const post = <T>(path: string, data?: unknown, options?: ApiOptions) =>
  api<T>(path, {
    ...options,
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  });
export const patch = <T>(path: string, data?: unknown, options?: ApiOptions) =>
  api<T>(path, {
    ...options,
    method: 'PATCH',
    body: data === undefined ? undefined : JSON.stringify(data),
  });
export const del = <T>(path: string, options?: ApiOptions) =>
  api<T>(path, { ...options, method: 'DELETE' });
