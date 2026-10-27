import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import type { DashboardSummary, MovementType, Product } from '../types';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function MovementBadge({ type }: { type: MovementType }) {
  if (type === 'IN') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        IN (Nhập)
      </span>
    );
  }
  if (type === 'OUT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        OUT (Xuất)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      ADJUST (Điều chỉnh)
    </span>
  );
}

function QuantityChange({ change }: { change: number }) {
  if (change > 0) {
    return <span className="font-semibold text-green-600">+{change}</span>;
  }
  if (change < 0) {
    return <span className="font-semibold text-red-600">{change}</span>;
  }
  return <span className="font-semibold text-gray-600">0</span>;
}

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api<DashboardSummary>('/dashboard/summary'),
  });

  const lowStockQuery = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => api<Product[]>('/products/low-stock'),
  });

  const isLoading = summaryQuery.isLoading || lowStockQuery.isLoading;
  const error = summaryQuery.error || lowStockQuery.error;

  const handleRetry = () => {
    summaryQuery.refetch();
    lowStockQuery.refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
        <div className="flex items-start gap-2.5 text-red-700">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Không thể tải dữ liệu</h3>
            <p className="text-sm mt-0.5">{errorMessage(error)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const lowStockProducts = lowStockQuery.data ?? [];
  const recentMovements = summary?.recent_movements ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tổng quan kho hàng</h1>
        <p className="text-sm text-gray-500 mt-1">Theo dõi số lượng hàng tồn và các biến động gần nhất</p>
      </div>

      {/* 2 Thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Thẻ 1: Tổng sản phẩm */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Tổng sản phẩm</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              {summary?.total_products ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">Sản phẩm đang kích hoạt</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        </div>

        {/* Thẻ 2: Sắp hết hàng */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Sắp hết hàng</p>
            <p
              className={`text-2xl sm:text-3xl font-bold mt-1 ${
                (summary?.low_stock_count ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {summary?.low_stock_count ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">Tồn kho ≤ mức tối thiểu</p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              (summary?.low_stock_count ?? 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Bảng Sắp hết hàng */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Sắp hết hàng</h2>
            <p className="text-xs text-gray-500 mt-0.5">Danh sách các sản phẩm đang chạm hoặc dưới mức tối thiểu</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
            {lowStockProducts.length} sản phẩm
          </span>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Không có sản phẩm nào sắp hết hàng.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-5 py-3">SKU</th>
                  <th scope="col" className="px-5 py-3">Tên sản phẩm</th>
                  <th scope="col" className="px-5 py-3">Tồn / Tối thiểu</th>
                  <th scope="col" className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{p.sku}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-red-600">{p.quantity}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-gray-600">{p.min_quantity}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Sắp hết hàng
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng 10 biến động gần nhất */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-base">10 biến động gần nhất</h2>
          <p className="text-xs text-gray-500 mt-0.5">Nhật ký các lần nhập, xuất và điều chỉnh kho</p>
        </div>

        {recentMovements.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Chưa có biến động kho nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-5 py-3">Loại</th>
                  <th scope="col" className="px-5 py-3">Thay đổi</th>
                  <th scope="col" className="px-5 py-3">Tồn sau</th>
                  <th scope="col" className="px-5 py-3">Lý do</th>
                  <th scope="col" className="px-5 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <MovementBadge type={m.type} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <QuantityChange change={m.quantity_change} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-800">
                      {m.quantity_after}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 max-w-xs truncate">
                      {m.reason || '—'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 text-xs">
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

