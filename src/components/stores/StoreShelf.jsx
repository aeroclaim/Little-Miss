import React from 'react';
import { useLang } from '@/lib/lang';
import { storeShelf } from '@/lib/logic/inventory';
import SerialBadge from '@/components/shared/SerialBadge';

// The numbers (and how many of each) currently on a store's shelf.
export default function StoreShelf({ stats }) {
  const { t, num } = useLang();
  const shelf = Object.entries(storeShelf(stats));
  if (!shelf.length) return <p className="text-sm text-muted-foreground">{t('אין מלאי בחנות.', 'No stock in this store.')}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {shelf.map(([serial, qty]) => (
        <span key={serial} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 ps-1 pe-3 text-sm">
          <SerialBadge serial={Number(serial)} size="sm" />
          <b className="tabular-nums">{num(qty)}</b>
        </span>
      ))}
    </div>
  );
}