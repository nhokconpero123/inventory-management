import { Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MovementsPage from './pages/MovementsPage';
import ProductsPage from './pages/ProductsPage';
import { RequireAuth } from './RouteGuards';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/movements" element={<MovementsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}