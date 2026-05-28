import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * Mobile-first DataTable.
 * - Desktop/tablet: semantic <table> with optional sticky header.
 * - Mobile: optional card rendering to avoid horizontal overflow.
 *
 * columns: [{ key, header, className, headerClassName, hideBelow, render(row) }]
 * hideBelow: 'md' | 'lg' (uses Tailwind responsive utilities)
 */
export default function DataTable({
  className,
  tableClassName,
  columns,
  rows,
  rowKey,
  loading,
  empty,
  stickyHeader = false,
  scrollX = true,
  mobileVariant = 'cards', // 'cards' | 'table'
  renderMobileCard,
  mobileCardClassName,
}) {
  const resolvedRowKey = useMemo(() => {
    if (typeof rowKey === 'function') return rowKey;
    if (typeof rowKey === 'string') return (r) => r?.[rowKey];
    return (r, idx) => r?.id ?? idx;
  }, [rowKey]);

  const hideMap = {
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
  };

  const showCardList =
    mobileVariant === 'cards' && typeof renderMobileCard === 'function';

  return (
    <div className={cn('w-full', className)}>
      {showCardList && (
        <div className={cn('space-y-3', 'md:hidden')}>
          {loading ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="h-4 w-40 skeleton" />
              <div className="mt-3 h-3 w-64 skeleton" />
              <div className="mt-6 h-9 w-full skeleton" />
            </div>
          ) : rows?.length ? (
            rows.map((row, idx) => (
              <div
                key={resolvedRowKey(row, idx)}
                className={cn(
                  'rounded-xl border border-slate-200 dark:border-slate-800',
                  'bg-white dark:bg-slate-900 shadow-card',
                  'p-4',
                  mobileCardClassName
                )}
              >
                {renderMobileCard(row)}
              </div>
            ))
          ) : (
            empty || null
          )}
        </div>
      )}

      <div
        className={cn(
          'table-wrapper',
          scrollX && 'table-scroll',
          showCardList ? 'hidden md:block' : null
        )}
      >
        <table className={cn('data-table', tableClassName)}>
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    c.headerClassName,
                    c.hideBelow ? hideMap[c.hideBelow] : null
                  )}
                  scope="col"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-fadeIn">
                  {columns.map((c) => (
                    <td
                      key={`${c.key}-${i}`}
                      className={cn(c.className, c.hideBelow ? hideMap[c.hideBelow] : null)}
                    >
                      <div className="h-4 w-full skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows?.length ? (
              rows.map((row, idx) => (
                <tr key={resolvedRowKey(row, idx)}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(c.className, c.hideBelow ? hideMap[c.hideBelow] : null)}
                    >
                      {typeof c.render === 'function' ? c.render(row) : row?.[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="p-6">{empty || null}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

