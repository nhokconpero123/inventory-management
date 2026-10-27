import type { Role } from './types';

// Dev: '/api' (proxy của Vite). Production: đặt VITE_API_URL trỏ về backend.
const BASE: string = import.meta.env.VITE_API_URL ?? '/api';
const STORAGE_KEY = 'ims_session';

export interface Session {
  token: string;
  role: Role;
  email: string;
}

/** Token lưu sessionStorage: mất khi đóng tab. Đánh đổi cho MVP: dễ bị XSS đọc, cần ghi vào README. */
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
    /* bỏ qua nếu trình duyệt chặn storage */
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

/** Gọi API: tự gắn Bearer token, trả JSON, lỗi ném ApiError. 401 (trừ login) → xóa phiên và phát sự kiện. */
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
  VALIDATION: 'Dữ liệu không hợp lệ.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn.',
  INVALID_CREDENTIALS: 'Sai email hoặc mật khẩu.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  CONFLICT: 'Dữ liệu bị trùng (SKU, email hoặc tên đã tồn tại).',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho.',
  NETWORK: 'Không kết nối được máy chủ. Thử lại sau.',
};

/** Chuyển lỗi thành câu tiếng Việt để hiển thị cho người dùng. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? 'Có lỗi xảy ra.';
  return 'Có lỗi xảy ra.';
}