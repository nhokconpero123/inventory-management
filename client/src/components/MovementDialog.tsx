import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth-context';
import type { Movement, MovementType, Product } from '../types';

interface MovementDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function MovementDialog({ open, onClose, product }: MovementDialogProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isAdmin = session?.role === 'admin';

  // Generate once when the modal opens and keep the key for retries.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open || !product) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedQty = parseInt(quantity, 10);
    if (Number.isNaN(parsedQty)) {
      setError('Please enter a valid quantity.');
      return;
    }

    // IN/OUT: positive integers.
    if (type === 'IN' || type === 'OUT') {
      if (parsedQty <= 0) {
        setError('Stock-in/out quantities must be positive integers greater than 0.');
        return;
      }
    }

    // ADJUST: signed integer other than 0.
    if (type === 'ADJUST') {
      if (parsedQty === 0) {
        setError('Adjustment quantity must be an integer other than 0.');
        return;
      }
      if (!reason.trim()) {
        setError('A reason is required for stock adjustments.');
        return;
      }
    }

    setSubmitting(true);

    try {
      await api<Movement>(`/products/${product.id}/movements`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: {
          type,
          quantity: parsedQty,
          reason: reason.trim() || undefined,
        },
      });

      // On success, invalidate the product and dashboard queries, then close the modal.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
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
          <div>
            <h2 className="text-lg font-bold text-gray-900">Stock movement</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {product.name} ({product.sku})
            </p>
          </div>
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

        {/* Current stock information */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Current stock:</span>
            <span
              className={`font-bold text-base ${
                product.quantity <= product.min_quantity ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {product.quantity}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
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
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Select movement type */}
          <div>
            <label htmlFor="movement-type" className="block text-sm font-medium text-gray-700 mb-1">
              Movement type <span className="text-red-500">*</span>
            </label>
            <select
              id="movement-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as MovementType);
                setError(null);
              }}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="IN">IN (Stock in)</option>
              <option value="OUT">OUT (Stock out)</option>
              {isAdmin && <option value="ADJUST">ADJUST (Adjust - Admin)</option>}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="movement-qty" className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'ADJUST' ? 'Quantity change (+ increase, - decrease)' : 'Quantity'} <span className="text-red-500">*</span>
            </label>
            <input
              id="movement-qty"
              type="number"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === 'ADJUST' ? 'e.g. 5 or -3' : 'e.g. 10'}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {type === 'IN' || type === 'OUT' ? (
              <p className="text-xs text-gray-400 mt-1">Enter a positive integer (the system calculates the stock change)</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Enter a non-zero signed integer (e.g. -5 to decrease stock, +5 to increase stock)</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="movement-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason {type === 'ADJUST' ? <span className="text-red-500">* (required)</span> : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <input
              id="movement-reason"
              type="text"
              required={type === 'ADJUST'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === 'ADJUST' ? 'e.g. Inventory count found missing items' : 'e.g. Stock received from supplier'}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              {type === 'IN' && (submitting ? 'Receiving stock...' : 'Confirm stock in')}
              {type === 'OUT' && (submitting ? 'Issuing stock...' : 'Confirm stock out')}
              {type === 'ADJUST' && (submitting ? 'Adjusting...' : 'Confirm adjustment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
