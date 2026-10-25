import React from 'react';
import { Input } from '@/components/ui/input';
import SerialBadge from '@/components/shared/SerialBadge';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

// Whole-number quantity per serial number. limits (optional) = the maximum allowed per serial.
export default function QtyGrid({ entries, value, onChange, limits, emptyText }) {
  const { t } = useLang();
  if (!entries.length) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        {emptyText || t('אין מספרים בקטלוג. הוסיפו אוסף קודם.', 'No numbers in the catalog. Add a collection first.')}
      </p>
    );
  }
  return (
    <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-3 md:grid-cols-4">
      {entries.map((e) => {
        const q = Number(value[e.serial]) || 0;
        const limit = limits ? Number(limits[e.serial]) || 0 : null;
        const over = limit !== null && q > limit;
        return (
          <label key={e.serial} className={cn('flex items-center gap-2 rounded-lg border bg-card p-1.5', over && 'border-destructive')}>
            <SerialBadge serial={e.serial} />
            <div className="min-w-0 flex-1">
              <Input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={value[e.serial] ?? ''}
                placeholder={limit !== null ? String(limit) : '0'}
                onChange={(ev) => onChange({ ...value, [e.serial]: ev.target.value.replace(/\D/g, '') })}
                className="h-8 px-2 text-center"
              />
            </div>
          </label>
        );
      })}
    </div>
  );
}