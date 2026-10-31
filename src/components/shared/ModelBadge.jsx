import React from 'react';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

export default function ModelBadge({ model, className }) {
  const { t } = useLang();
  const invoice = model === 'invoice';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        invoice ? 'bg-amber-100 text-amber-800' : 'bg-brand/10 text-brand',
        className
      )}
    >
      {invoice ? t('חשבונית באספקה', 'Invoice on delivery') : t('תשלום לפי מכירה', 'Consignment')}
    </span>
  );
}