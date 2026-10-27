import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth-context';
import MovementDialog from '../components/MovementDialog';
import ProductFormDialog from '../components/ProductFormDialog';
import type { Category, Paged, Product } from '../types';

export default function ProductsPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    product: Product | null;
  }>({ open: false, product: null });
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);

  // Debounce ô tìm kiếm 300ms, khi từ khóa thay đổi thì về trang 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== search) {
          setPage(1);
        }
        return search;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Lấy danh mục
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Lấy danh sách sản phẩm
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', { q: debouncedSearch, category_id: selectedCategory, low_stock: lowStockOnly, page }],
    queryFn: () =>
      api<Paged<Product>>('/products', {
        query: {
          q: debouncedSearch.trim() || undefined,
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          low_stock: lowStockOnly ? '1' : undefined,
          page,
          limit: 20,
        },
      }),
  });

  const items = productsData?.items ?? [];
  const total = productsData?.total ?? 0;
  const currentPage = productsData?.page ?? page;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const startIdx = total === 0 ? 0 : (currentPage - 1) * 20 + 1;
  const endIdx = Math.min(currentPage * 20, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Danh sách sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và tra cứu thông tin tồn kho sản phẩm</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setDialogState({ open: true, product: null })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors self-start sm:self-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm sản phẩm</span>
          </button>
        )}
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc SKU..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dropdown danh mục */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Checkbox sắp hết hàng */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 font-medium py-1">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Sắp hết hàng</span>
        </label>
      </div>

      {/* Trạng thái lỗi */}
      {isError && (
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
              <h3 className="font-semibold text-sm">Không thể tải danh sách sản phẩm</h3>
              <p className="text-sm mt-0.5">{errorMessage(error)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">Đang tải danh sách sản phẩm...</p>
        </div>
      )}

      {/* Bảng sản phẩm */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-5 py-3">SKU</th>
                      <th scope="col" className="px-5 py-3">Tên sản phẩm</th>
                      <th scope="col" className="px-5 py-3">Danh mục</th>
                      <th scope="col" className="px-5 py-3">Tồn kho</th>
                      <th scope="col" className="px-5 py-3">Tối thiểu</th>
                      <th scope="col" className="px-5 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((product) => {
                      const isLowStock = product.quantity <= product.min_quantity;
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                            {product.sku}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-800">
                            {product.name}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-gray-600">
                            {product.category_id ? categoryMap.get(product.category_id) ?? '—' : '—'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={isLowStock ? 'font-bold text-red-600' : 'text-gray-800'}>
                              {product.quantity}
                            </span>
                            {isLowStock && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                Sắp hết
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-gray-600">
                            {product.min_quantity}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => setMovementProduct(product)}
                              className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline px-1 py-0.5 rounded"
                            >
                              Nhập/Xuất
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDialogState({ open: true, product })}
                                className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5 rounded"
                              >
                                Sửa
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân trang */}
              <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
                <div>
                  Hiển thị <span className="font-medium text-gray-900">{startIdx}</span> -{' '}
                  <span className="font-medium text-gray-900">{endIdx}</span> trên tổng số{' '}
                  <span className="font-medium text-gray-900">{total}</span> sản phẩm
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500 font-medium px-2">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {dialogState.open && (
        <ProductFormDialog
          key={dialogState.product ? `edit-${dialogState.product.id}` : 'create'}
          open={dialogState.open}
          product={dialogState.product}
          categories={categories}
          onClose={() => setDialogState({ open: false, product: null })}
        />
      )}

      {movementProduct && (
        <MovementDialog
          key={`movement-${movementProduct.id}`}
          open={Boolean(movementProduct)}
          product={movementProduct}
          onClose={() => setMovementProduct(null)}
        />
      )}
    </div>
  );
}
