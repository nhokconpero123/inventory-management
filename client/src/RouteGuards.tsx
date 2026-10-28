import { Navigate, Outlet } from 'react-router';
import { useAuth } from './auth-context';

export function RequireAuth() {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RequireAdmin() {
  const { session } = useAuth();
  return session?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}