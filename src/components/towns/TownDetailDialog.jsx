import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import SerialBadge from '@/components/shared/SerialBadge';
import LevelBadge from '@/components/shared/LevelBadge';
import TownAssignmentsDialog from '@/components/towns/TownAssignmentsDialog';

// Missing numbers come first: they are the ones worth delivering to this town.
const GROUPS = ['absent', 'very_rare', 'rare', 'common', 'abundant'];

export default function TownDetailDialog({ town, onClose }) {
  const { t, num, money } = useLang();
  const { model } = useAppData();
  const [editing, setEditing] = useState(false);
  const table = model.rarity.byTown[town.town];
  const stores = town.storeIds.map((id) => model.storeById[id]).filter(Boolean);
  const stats = [
    [t('חנויות', 'Stores'), num(town.storeCount)],
    [t('סופקו', 'Delivered'), num(town.delivered)],
    [t('בשוק', 'In the market'), num(town.inMarket)],
    [t('נמכרו', 'Sold'), num(town.sold)],
    [t('על המדף', 'On shelf'), num(town.inStore)],
    [t('יתרת חוב', 'Balance'), money(town.balance, 0)],
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl gap-5 overflow-y-auto rounded-2xl sm:rounded-2xl">
        <DialogHeader className="text-start sm:text-start">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-display text-2xl font-bold">{town.town}</DialogTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />{t('מספרים והערות', 'Numbers & notes')}</Button>
          </div>
          <DialogDescription>
            {t(`כיסוי של ${town.coveredCount} מתוך ${table.rows.length} מספרים שהודפסו`, `Covers ${town.coveredCount} of ${table.rows.length} printed numbers`)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        {GROUPS.map((level) => {
          const rows = table.rows.filter((r) => r.level === level);
          if (!rows.length) return null;
          return (
            <div key={level}>
              <div className="mb-2 flex items-center gap-2">
                <LevelBadge level={level} />
                <span className="text-xs text-muted-foreground">{num(rows.length)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rows.map((r) => (
                  <span key={r.serial} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 ps-0.5 pe-2 text-xs">
                    <SerialBadge serial={r.serial} size="sm" />
                    {level !== 'absent' && <span className="tabular-nums text-muted-foreground">×{num(r.count)}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <div>
          {!!model.townByName[town.town]?.notes && (
            <p className="mb-3 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{model.townByName[town.town].notes}</p>
          )}
          <p className="mb-2 text-sm font-medium">{t('חנויות בעיר', 'Stores in this town')}</p>
          <div className="flex flex-wrap gap-2">
            {stores.map((s) => (
              <Link key={s.id} to={`/stores/${s.id}`} className="rounded-full border bg-card px-3 py-1 text-sm hover:bg-accent">{s.name}</Link>
            ))}
          </div>
        </div>
      </DialogContent>
      {editing && <TownAssignmentsDialog town={town.town} onClose={() => setEditing(false)} />}
    </Dialog>
  );
}