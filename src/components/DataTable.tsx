import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Plus, Trash2, Pencil, Eye } from 'lucide-react';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  meta?: { current_page: number; last_page: number; total: number };
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  onCreate?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canDeleteItem?: (item: T) => boolean;
  createLabel?: string;
  searchPlaceholder?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  keyExtractor: (item: T) => string | number;
}

export default function DataTable<T>({
  title,
  columns,
  data,
  loading,
  meta,
  onPageChange,
  onSearch,
  onCreate,
  onView,
  onEdit,
  onDelete,
  canDeleteItem,
  createLabel = 'Novo',
  searchPlaceholder = 'Buscar...',
  canCreate = true,
  canEdit = true,
  canDelete = false,
  keyExtractor,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    onSearch?.(val);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onSearch && (
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          )}
          {canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'text-left px-4 py-3 font-medium text-gray-500',
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
              {(onView || onEdit || onDelete) && (
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-12 text-gray-400">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className={clsx('px-4 py-3', col.className)}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {(onView || onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && onDelete && (canDeleteItem ? canDeleteItem(item) : true) && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {meta.total} registro{meta.total !== 1 && 's'}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(meta.current_page - 1)}
              disabled={meta.current_page <= 1}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 px-2">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              onClick={() => onPageChange?.(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
