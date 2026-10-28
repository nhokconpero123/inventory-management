import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import type { Category, Product } from '../types';

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories?: Category[];
}

export default function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
}: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(product);

  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(
    product?.category_id ? String(product.category_id) : '',
  );
  const [minQuantity, setMinQuantity] = useState(
    product ? String(product.min_quantity) : '0',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSku = sku.trim();
    const trimmedName = name.trim();
    const parsedMinQty = Math.max(0, parseInt(minQuantity, 10) || 0);

    if (!trimmedSku || !trimmedName) {
      setError('Please enter both an SKU and a product name.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && product) {
        // Edit with PATCH /products/:id (do not send quantity).
        await api<Product>(`/products/${product.id}`, {
          method: 'PATCH',
          body: {
            sku: trimmedSku,
            name: trimmedName,
            category_id: categoryId ? Number(categoryId) : null,
            min_quantity: parsedMinQty,
          },
        });
      } else {
        // Create with POST /products (do not send quantity).
        const body: {
          sku: string;
          name: string;
          category_id?: number;
          min_quantity: number;
        } = {
          sku: trimmedSku,
          name: trimmedName,
          min_quantity: parsedMinQty,
        };
        if (categoryId) {
          body.category_id = Number(categoryId);
        }
        await api<Product>('/products', {
          method: 'POST',
          body,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit product' : 'Add product'}
          </h2>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
            >
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="product-sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              id="product-sku"
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. IP15-128"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
              Product name <span className="text-red-500">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 15 128GB"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- No category --</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product-min-quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Min. stock
            </label>
            <input
              id="product-min-quantity"
              type="number"
              min="0"
              required
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Low stock warning when stock is ≤ this value</p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {isEdit ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
