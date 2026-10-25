import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const ALIGN = { start: 'text-start', center: 'text-center', end: 'text-end' };

function compare(a, b) {
  if (typeof a === 'string' || typeof b === 'string') return String(a ?? '').localeCompare(String(b ?? ''), 'he');
  return (a ?? 0) - (b ?? 0);
}

// columns: [{ key, header, cell?(row), sort?(row)->value, align?, firstSort?, className? }]
export default function DataTable({ columns, rows, onRowClick, initialSort, empty, totals, className }) {
  const [sort, setSort] = useState(initialSort || null);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col || !col.sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compare(col.sort(a), col.sort(b)) * dir);
  }, [rows, columns, sort]);

  const toggle = (col) => {
    if (!col.sort) return;
    setSort((s) =>
      s?.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: col.firstSort || 'asc' }
    );
  };

  if (!rows.length && empty) return empty;

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-soft', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn('h-11 whitespace-nowrap px-4 text-xs font-semibold', ALIGN[c.align || 'start'], c.headerClassName)}>
                {c.sort ? (
                  <button type="button" onClick={() => toggle(c)} className="inline-flex items-center gap-1 hover:text-foreground">
                    {c.header}
                    {sort?.key === c.key ? (
                      sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow key={row.id ?? i} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && 'cursor-pointer')}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn('px-4 py-3', ALIGN[c.align || 'start'], c.className)}>
                  {c.cell ? c.cell(row) : row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {totals && (
          <TableFooter>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn('px-4 py-3 font-semibold tabular-nums', ALIGN[c.align || 'start'])}>
                  {totals[c.key] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}