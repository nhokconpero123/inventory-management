import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import type { Movement, MovementType, Paged } from '../types';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
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
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        IN (Stock In)
      </span>
    );
  }
  if (type === 'OUT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        OUT (Stock Out)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
      ADJUST (Adjustment)
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

export default function MovementsPage() {
  const [type, setType] = useState<MovementType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Call GET /movements.
  const {
    data: movementsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['movements', { type, from, to, page }],
    queryFn: () =>
      api<Paged<Movement>>('/movements', {
        query: {
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 20,
        },
      }),
  });

  const items = movementsData?.items ?? [];
  const total = movementsData?.total ?? 0;
  const currentPage = movementsData?.page ?? page;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const startIdx = total === 0 ? 0 : (currentPage - 1) * 20 + 1;
  const endIdx = Math.min(currentPage * 20, total);

  const handleResetFilters = () => {
    setType('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasFilter = Boolean(type || from || to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Movement History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review the detailed log of all stock-in, stock-out, and adjustment operations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Filter by type */}
        <div className="w-full md:w-52">
          <label htmlFor="filter-type" className="block text-xs font-medium text-gray-500 mb-1">
            Movement type
          </label>
          <select
            id="filter-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as MovementType | '');
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All types</option>
            <option value="IN">IN (Stock In)</option>
            <option value="OUT">OUT (Stock Out)</option>
            <option value="ADJUST">ADJUST (Adjustment)</option>
          </select>
        </div>

        {/* Filter from date */}
        <div className="w-full md:w-48">
          <label htmlFor="filter-from" className="block text-xs font-medium text-gray-500 mb-1">
            From date
          </label>
          <input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter to date */}
        <div className="w-full md:w-48">
          <label htmlFor="filter-to" className="block text-xs font-medium text-gray-500 mb-1">
            To date
          </label>
          <input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Clear filters button */}
        {hasFilter && (
          <div className="md:self-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full md:w-auto px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
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
              <h3 className="font-semibold text-sm">Unable to load movement history</h3>
              <p className="text-sm mt-0.5">{errorMessage(error)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">Loading movement history...</p>
        </div>
      )}

      {/* Stock movements table */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              {hasFilter
                ? 'No stock movements match the selected filters.'
                : 'No stock movements yet.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-5 py-3">Date and time</th>
                      <th scope="col" className="px-5 py-3">Product ID</th>
                      <th scope="col" className="px-5 py-3">Type</th>
                      <th scope="col" className="px-5 py-3">Change</th>
                      <th scope="col" className="px-5 py-3">Stock after</th>
                      <th scope="col" className="px-5 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-gray-500 text-xs">
                          {formatDate(m.created_at)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-900">
                          #{m.product_id}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
                <div>
                  Showing <span className="font-medium text-gray-900">{startIdx}</span> -{' '}
                  <span className="font-medium text-gray-900">{endIdx}</span> of{' '}
                  <span className="font-medium text-gray-900">{total}</span> movements
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500 font-medium px-2">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
