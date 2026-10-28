import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth-context';

/** Redirect unauthenticated users to /login. */
export function RequireAuth() {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Admin only. Staff are redirected to the home page. (The server still enforces permissions.) */
export function RequireAdmin() {
  const { session } = useAuth();
  return session?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}