import React from 'react';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

const LABELS = {
  absent: ['לא הופץ', 'Not distributed'],
  very_rare: ['נדיר מאוד', 'Very rare'],
  rare: ['נדיר', 'Rare'],
  common: ['רגיל', 'Common'],
  abundant: ['נפוץ', 'Abundant'],
};

const BADGE = {
  absent: 'bg-zinc-100 text-zinc-500',
  very_rare: 'bg-rose-100 text-rose-700',
  rare: 'bg-amber-100 text-amber-800',
  common: 'bg-emerald-100 text-emerald-800',
  abundant: 'bg-sky-100 text-sky-800',
};

// Solid fills used by the town x number heat map.
export const LEVEL_CELL = {
  absent: 'bg-zinc-100 text-zinc-400',
  very_rare: 'bg-rose-500 text-white',
  rare: 'bg-amber-300 text-amber-950',
  common: 'bg-emerald-200 text-emerald-900',
  abundant: 'bg-sky-300 text-sky-950',
};

export function levelLabel(level, t) {
  const [he, en] = LABELS[level] || LABELS.common;
  return t(he, en);
}

export default function LevelBadge({ level, className }) {
  const { t } = useLang();
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', BADGE[level], className)}>
      {levelLabel(level, t)}
    </span>
  );
}