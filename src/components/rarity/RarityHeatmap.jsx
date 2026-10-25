import React from 'react';
import { useLang } from '@/lib/lang';
import { LEVELS } from '@/lib/logic/rarity';
import { LEVEL_CELL, levelLabel } from '@/components/shared/LevelBadge';
import { cn } from '@/lib/utils';

// Towns x numbers. Each cell shows the copies in the town; its colour is the rarity of that number inside the town.
export default function RarityHeatmap({ towns, serials, byTown }) {
  const { t, num } = useLang();
  if (!towns.length) return <p className="text-sm text-muted-foreground">{t('אין חנויות עדיין.', 'No stores yet.')}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((level) => (
          <span key={level} className={cn('rounded px-2 py-0.5 text-xs font-medium', LEVEL_CELL[level])}>{levelLabel(level, t)}</span>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-xl border">
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky start-0 top-0 z-30 whitespace-nowrap border-b border-e bg-muted px-3 py-2 text-start font-semibold">{t('עיר', 'Town')}</th>
              {serials.map((serial) => (
                <th key={serial} dir="ltr" className="sticky top-0 z-20 min-w-9 border-b bg-muted px-1 py-2 text-center font-semibold tabular-nums">{serial}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {towns.map((town) => (
              <tr key={town.town}>
                <th className="sticky start-0 z-10 whitespace-nowrap border-b border-e bg-card px-3 py-1.5 text-start font-medium">{town.town}</th>
                {byTown[town.town].rows.map((r) => (
                  <td
                    key={r.serial}
                    title={`${town.town} · #${r.serial} · ${num(r.count)}`}
                    className={cn('h-8 min-w-9 border-b border-card text-center tabular-nums', LEVEL_CELL[r.level])}
                  >
                    {r.count || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}