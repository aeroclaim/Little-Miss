import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Field({ label, hint, error, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label className="text-[13px] font-medium text-muted-foreground">{label}</Label>}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}