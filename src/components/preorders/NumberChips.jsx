import React from 'react';
import { useLang } from '@/lib/lang';
import SerialBadge from '@/components/shared/SerialBadge';

// A compact list of the specific numbers (and quantities) of a preorder.
export default function NumberChips({ items, max = 5 }) {
  const { num } = useLang();
  const list = items || [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.slice(0, max).map((it) => (
        <span key={it.serial_number} className="inline-flex items-center gap-1">
          <SerialBadge serial={it.serial_number} size="sm" />
          {it.quantity > 1 && <span className="text-xs text-muted-foreground">×{num(it.quantity)}</span>}
        </span>
      ))}
      {list.length > max && <span className="text-xs text-muted-foreground">+{list.length - max}</span>}
    </div>
  );
}