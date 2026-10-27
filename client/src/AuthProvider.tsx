import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getSession, setSession, AUTH_EXPIRED_EVENT, type Session } from './api';
import { AuthContext } from './auth-context';
import type { LoginResponse } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setState] = useState<Session | null>(getSession);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
    const s: Session = { token: r.token, role: r.role, email };
    setSession(s);
    setState(s);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setState(null);
  }, []);

  // api() phát sự kiện này khi server trả 401 (token hết hạn)
  useEffect(() => {
    const onExpired = () => setState(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}