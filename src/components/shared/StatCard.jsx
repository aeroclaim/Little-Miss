import React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  lavender: 'bg-lavender text-indigo-700',
  rose: 'bg-rose-100 text-rose-600',
  mint: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  ink: 'bg-primary text-primary-foreground',
};

export default function StatCard({ label, value, hint, icon: Icon, tone = 'lavender', className }) {
  return (
    <div className={cn('rounded-2xl border bg-card p-5 shadow-soft', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-[32px] font-bold leading-none tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}