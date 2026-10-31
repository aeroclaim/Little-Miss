import React, { useRef, useState } from 'react';
import { ImageUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { dataLayer } from '@/data/dataLayer';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { todayISO } from '@/lib/logic/format';

export const EXPENSE_CATEGORIES = [
  { value: 'materials', he: 'חומרים', en: 'Materials' },
  { value: 'shipping', he: 'משלוח והובלה', en: 'Shipping and delivery' },
  { value: 'packaging', he: 'אריזה', en: 'Packaging' },
  { value: 'marketing', he: 'שיווק', en: 'Marketing' },
  { value: 'equipment', he: 'ציוד', en: 'Equipment' },
  { value: 'other', he: 'אחר', en: 'Other' },
];

export const expenseCategoryLabel = (category, t) => {
  const found = EXPENSE_CATEGORIES.find((item) => item.value === category);
  return found ? t(found.he, found.en) : category || t('אחר', 'Other');
};

export default function ExpenseForm({ expense, onClose }) {
  const { t } = useLang();
  const { save } = useActions();
  const fileInput = useRef(null);
  const [values, setValues] = useState({
    expense_date: expense?.expense_date || todayISO(),
    amount: expense?.amount ?? '',
    category: expense?.category || 'other',
    description: expense?.description || '',
    receipt_file: expense?.receipt_file || '',
    notes: expense?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState(null);
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const uploadReceipt = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setFailure(null);
    try {
      const receiptFile = await dataLayer.uploadPrivateFile(file);
      setValues((current) => ({ ...current, receipt_file: receiptFile }));
    } catch (error) {
      setFailure({ message: t(`העלאת הקבלה נכשלה: ${error.message}`, `Receipt upload failed: ${error.message}`) });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    const result = await save('expenses', {
      ...values,
      amount: Number(values.amount),
    }, expense?.id);
    setSaving(false);
    if (result.ok) onClose();
    else setFailure(result);
  };

  return (
    <FormDialog
      title={expense ? t('עריכת הוצאה', 'Edit expense') : t('הוצאה חדשה', 'New expense')}
      onClose={onClose}
      onSubmit={submit}
      saving={saving || uploading}
      canSubmit={!!values.expense_date && !!values.description.trim() && Number(values.amount) > 0}
      error={failure && <ViolationAlert result={failure} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('תאריך', 'Date')}><Input type="date" value={values.expense_date} onChange={set('expense_date')} /></Field>
        <Field label={t('סכום (₪)', 'Amount (ILS)')}><Input type="number" min="0.01" step="0.01" dir="ltr" value={values.amount} onChange={set('amount')} /></Field>
      </div>
      <Field label={t('קטגוריה', 'Category')}>
        <select value={values.category} onChange={set('category')} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {EXPENSE_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{t(category.he, category.en)}</option>)}
        </select>
      </Field>
      <Field label={t('תיאור ההוצאה', 'Expense description')}><Input value={values.description} onChange={set('description')} /></Field>
      <Field label={t('קבלה או אסמכתא', 'Receipt or supporting document')}>
        <input ref={fileInput} type="file" accept="image/*,.pdf" className="hidden" onChange={uploadReceipt} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
            <ImageUp className="h-4 w-4" />{uploading ? t('מעלה...', 'Uploading...') : t('צירוף קובץ', 'Attach file')}
          </Button>
          {values.receipt_file && (
            <span className="flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs">
              <span className="max-w-64 truncate" dir="ltr">{values.receipt_file.split(':').pop()}</span>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label={t('הסרת קובץ', 'Remove attachment')} onClick={() => setValues((current) => ({ ...current, receipt_file: '' }))}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </span>
          )}
        </div>
      </Field>
      <Field label={t('הערות', 'Notes')}><Textarea rows={3} value={values.notes} onChange={set('notes')} /></Field>
    </FormDialog>
  );
}
