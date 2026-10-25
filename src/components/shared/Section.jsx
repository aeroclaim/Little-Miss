import React from 'react';
import { cn } from '@/lib/utils';

export default function Section({ title, description, actions, children, className, bodyClassName }) {
  return (
    <section className={cn('rounded-2xl border bg-card shadow-soft', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}