import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth-context';

/** Chưa đăng nhập → về /login. */
export function RequireAuth() {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Chỉ admin. Staff bị đưa về trang chủ. (Quyền thật vẫn do server kiểm tra.) */
export function RequireAdmin() {
  const { session } = useAuth();
  return session?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}