import React from 'react';

// Sortable tables: click a header to sort by it, click again to reverse.

// Sort rows by one column; nulls always last. dir: 'asc' | 'desc'.
export function sortRows(rows, get, dir) {
  const k = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a); const y = get(b);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * k;
  });
}

// The column a sort state ({ key, dir }) points at, falling back to
// fallbackKey (descending) when that column isn't shown.
export function activeSort(cols, sort, fallbackKey) {
  const col = cols.find(c => c.key === sort.key) || cols.find(c => c.key === fallbackKey);
  return { col, dir: col.key === sort.key ? sort.dir : 'desc' };
}
// Clicking the sorted column flips it; another column starts in its natural
// direction (c.dir, default descending: biggest first).
export const nextSort = (prev, c) => (prev.key === c.key ? { key: c.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: c.dir || 'desc' });

// Clickable column headers with ▲/▼ on the sorted one.
export function SortHead({ cols, col, dir, onSort }) {
  return (
    <thead><tr>
      {cols.map(c => (
        <th key={c.key} className={c.left ? '' : 'text-center'} title={c.title} aria-sort={c.key === col.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
          <button type="button" className={`sort-th${c.key === col.key ? ' on' : ''}`} onClick={() => onSort(c)}>
            {c.label}<span className="sort-mark" aria-hidden="true">{c.key === col.key ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
          </button>
        </th>
      ))}
    </tr></thead>
  );
}
