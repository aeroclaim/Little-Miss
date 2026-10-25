import React from 'react';
import { useLang } from '@/lib/lang';
import { PREORDER_STATUSES, optionLabel } from '@/lib/logic/options';
import { cn } from '@/lib/utils';

const TONE = {
  open: 'bg-indigo-50 text-indigo-700',
  fulfilled: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-zinc-100 text-zinc-500',
};

export default function StatusBadge({ status }) {
  const { t } = useLang();
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONE[status] || TONE.open)}>
      {optionLabel(PREORDER_STATUSES, status || 'open', t)}
    </span>
  );
}