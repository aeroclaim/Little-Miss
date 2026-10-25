import React from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

// Shared shell for every create / edit form. Mount it only while it should be open.
export default function FormDialog({ title, description, onClose, onSubmit, saving, error, submitLabel, wide, canSubmit = true, children }) {
  const { t } = useLang();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl',
          wide ? 'max-w-5xl' : 'max-w-xl'
        )}
      >
        <DialogHeader className="border-b px-6 py-5 pe-12 text-start sm:text-start">
          <DialogTitle className="font-display text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className={description ? '' : 'sr-only'}>{description || title}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {children}
          {error}
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('ביטול', 'Cancel')}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={saving || !canSubmit} className="min-w-28">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel || t('שמירה', 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}