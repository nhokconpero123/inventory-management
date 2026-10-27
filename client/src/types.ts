export type Role = 'admin' | 'staff';
export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  quantity: number;
  min_quantity: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: number;
  product_id: number;
  type: MovementType;
  quantity_change: number;
  quantity_after: number;
  reason: string | null;
  created_by: number | null;
  created_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
}

export interface DashboardSummary {
  total_products: number;
  low_stock_count: number;
  recent_movements: Movement[];
}

export interface LoginResponse {
  token: string;
  role: Role;
}