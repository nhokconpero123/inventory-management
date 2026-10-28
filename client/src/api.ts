import type { Role } from './types';

// Dev: '/api' (Vite proxy). Production: set VITE_API_URL to the backend URL.
const BASE: string = import.meta.env.VITE_API_URL ?? '/api';
const STORAGE_KEY = 'ims_session';

export interface Session {
  token: string;
  role: Role;
  email: string;
}

/** Token lives in sessionStorage: cleared when the tab closes. MVP trade-off: readable by XSS, documented in the README. */
export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore if the browser blocks storage */
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

interface Options {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined | null>;
}

/** Call the API: attaches the Bearer token, returns JSON, throws ApiError on failure. A 401 (except on login) clears the session and fires an event. */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { ...opts.headers };
  const session = getSession();
  if (session) headers.Authorization = `Bearer ${session.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = typeof data?.error === 'string' ? data.error : 'UNKNOWN';
    if (res.status === 401 && path !== '/auth/login') {
      setSession(null);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

const MESSAGES: Record<string, string> = {
  VALIDATION: 'Invalid data.',
  UNAUTHORIZED: 'Your session has expired.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  FORBIDDEN: 'You do not have permission to do this.',
  NOT_FOUND: 'Data not found.',
  CONFLICT: 'Duplicate data (SKU, email or name already exists).',
  INSUFFICIENT_STOCK: 'Insufficient stock.',
  NETWORK: 'Cannot reach the server. Please try again later.',
};

/** Turn an error into an English message for the user. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? 'Something went wrong.';
  return 'Something went wrong.';
}