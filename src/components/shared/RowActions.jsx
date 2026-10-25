import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang';

export default function RowActions({ onEdit, onDelete }) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {onEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title={t('עריכה', 'Edit')}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title={t('מחיקה', 'Delete')}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}