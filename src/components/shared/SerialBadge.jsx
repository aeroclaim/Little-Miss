import React from 'react';
import { useAppData } from '@/hooks/useAppData';
import { NEUTRAL_TONE } from '@/lib/logic/serials';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-6 min-w-6 px-1.5 text-xs',
  md: 'h-8 min-w-8 px-2 text-sm',
  lg: 'h-11 min-w-11 px-3 text-lg',
};

// The serial number as a small coloured pill. The colour comes from its collection.
export default function SerialBadge({ serial, size = 'md', className }) {
  const app = useAppData();
  const tone = app?.model?.toneBySerial?.[serial] || NEUTRAL_TONE;
  return (
    <span
      dir="ltr"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold leading-none tabular-nums', SIZES[size], className)}
      style={{ background: tone.bg, color: tone.fg }}
    >
      {serial}
    </span>
  );
}