import React, { useEffect, useId, useMemo, useState } from 'react';
import { Check, ListChecks, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SerialBadge from '@/components/shared/SerialBadge';
import { useLang } from '@/lib/lang';
import { collectionLabel } from '@/lib/logic/serials';
import { cn } from '@/lib/utils';

// Whole-number quantity per serial number. limits (optional) = the maximum allowed per serial.
export default function QtyGrid({ entries, value, onChange, limits, emptyText }) {
  const { t, lang } = useLang();
  const bulkInputId = useId();
  const [selected, setSelected] = useState(() => new Set());
  const [bulkQuantity, setBulkQuantity] = useState('');
  const entrySerials = entries.map((entry) => entry.serial).join(',');
  const groups = useMemo(() => {
    const byCollection = new Map();
    for (const entry of entries) {
      const key = entry.collection?.id || '__uncategorized';
      if (!byCollection.has(key)) {
        byCollection.set(key, {
          key,
          label: collectionLabel(entry.collection, lang),
          serials: [],
        });
      }
      byCollection.get(key).serials.push(entry.serial);
    }
    return [...byCollection.values()];
  }, [entries, lang]);

  useEffect(() => {
    const available = new Set(entries.map((entry) => entry.serial));
    setSelected((current) => new Set([...current].filter((serial) => available.has(serial))));
  }, [entrySerials]);

  if (!entries.length) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        {emptyText || t('אין מספרים בקטלוג. הוסיפו אוסף קודם.', 'No numbers in the catalog. Add a collection first.')}
      </p>
    );
  }

  const allSelected = selected.size === entries.length;
  const toggleSelection = (serials) => {
    setSelected((current) => {
      const next = new Set(current);
      const shouldSelect = !serials.every((serial) => next.has(serial));
      for (const serial of serials) {
        if (shouldSelect) next.add(serial);
        else next.delete(serial);
      }
      return next;
    });
  };
  const applyBulkQuantity = () => {
    if (bulkQuantity === '' || !selected.size) return;
    const next = { ...value };
    for (const serial of selected) next[serial] = bulkQuantity;
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => toggleSelection(entries.map((entry) => entry.serial))}>
          {allSelected ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
          {allSelected ? t('ביטול בחירה', 'Clear selection') : t('בחירת הכל', 'Select all')}
        </Button>
        {groups.map((group) => {
          const groupSelected = group.serials.every((serial) => selected.has(serial));
          return (
            <Button
              key={group.key}
              type="button"
              size="sm"
              variant={groupSelected ? 'secondary' : 'outline'}
              aria-pressed={groupSelected}
              onClick={() => toggleSelection(group.serials)}
            >
              {groupSelected && <Check className="h-3.5 w-3.5" />}
              {group.label}
              <span className="text-muted-foreground">({group.serials.length})</span>
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28">
          <label htmlFor={bulkInputId} className="mb-1 block text-xs text-muted-foreground">
            {t('כמות אחידה', 'Same quantity')}
          </label>
          <Input
            id={bulkInputId}
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={bulkQuantity}
            onChange={(event) => setBulkQuantity(event.target.value.replace(/\D/g, ''))}
            className="h-9 text-center"
          />
        </div>
        <Button type="button" size="sm" disabled={!selected.size || bulkQuantity === ''} onClick={applyBulkQuantity}>
          {t('החלה על הבחירה', 'Apply to selected')}
        </Button>
        <span className="pb-2 text-xs text-muted-foreground" aria-live="polite">
          {t(`נבחרו ${selected.size} מספרים`, `${selected.size} numbers selected`)}
        </span>
      </div>
      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-lg bg-muted/30 p-2 sm:grid-cols-3 md:grid-cols-4">
        {entries.map((e) => {
          const q = Number(value[e.serial]) || 0;
          const limit = limits ? Number(limits[e.serial]) || 0 : null;
          const over = limit !== null && q > limit;
          return (
            <div key={e.serial} className={cn('flex items-center gap-2 rounded-lg border bg-card p-1.5', over && 'border-destructive', selected.has(e.serial) && 'border-ring')}>
              <input
                type="checkbox"
                checked={selected.has(e.serial)}
                onChange={() => toggleSelection([e.serial])}
                aria-label={t(`בחירת מספר ${e.serial}`, `Select number ${e.serial}`)}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              <SerialBadge serial={e.serial} />
              <div className="min-w-0 flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={value[e.serial] ?? ''}
                  placeholder={limit !== null ? String(limit) : '0'}
                  aria-label={t(`כמות למספר ${e.serial}`, `Quantity for number ${e.serial}`)}
                  onChange={(ev) => onChange({ ...value, [e.serial]: ev.target.value.replace(/\D/g, '') })}
                  className="h-8 px-2 text-center"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}