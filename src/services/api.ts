/** Thin client for the LevelUp backend (see /server). */

const TOKEN_KEY = 'levelup:token';
const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable — the session just won't survive a reload
  }
}

export async function api<T>(method: string, path: string, body?: unknown, opts: { keepalive?: boolean } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive: opts.keepalive,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is it running?');
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON (e.g. the dev server's HTML when the API isn't running).
    throw new ApiError(res.status || 0, 'Unexpected response from the server.');
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
  return data as T;
}

/** True when the backend answers. Short timeout so offline mode starts fast. */
export async function backendAvailable(timeoutMs = 2500): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api<{ token: string; user: ApiUser }>('POST', '/auth/register', { email, password, name }),
  login: (email: string, password: string) => api<{ token: string; user: ApiUser }>('POST', '/auth/login', { email, password }),
  logout: () => api<null>('POST', '/auth/logout'),
  me: () => api<{ user: ApiUser }>('GET', '/me'),
};
