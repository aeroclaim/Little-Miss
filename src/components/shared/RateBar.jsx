import React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  rose: 'bg-rose-400',
  indigo: 'bg-indigo-400',
  mint: 'bg-emerald-400',
  amber: 'bg-amber-400',
};

// A tiny inline bar: value is compared to max (default 1 = 100%).
export default function RateBar({ value, max = 1, label, tone = 'rose', className }) {
  const pct = Math.min(100, Math.max(0, ((Number(value) || 0) / (max || 1)) * 100));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', TONES[tone])} style={{ width: `${pct}%` }} />
      </div>
      <span className="min-w-9 text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  );
}