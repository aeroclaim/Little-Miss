import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import QtyGrid from '@/components/shared/QtyGrid';
import StoreCombobox from '@/components/shared/StoreCombobox';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { itemsToMap, mapToItems } from '@/lib/logic/items';
import { PREORDER_STATUSES } from '@/lib/logic/options';
import { ISRAELI_TOWNS } from '@/lib/logic/towns';
import { sumQty, todayISO } from '@/lib/logic/format';

export default function PreorderForm({ preorder, onClose }) {
  const { t } = useLang();
  const { data, model } = useAppData();
  const { save } = useActions();
  const [date, setDate] = useState(preorder?.preorder_date || todayISO());
  const [storeId, setStoreId] = useState(preorder?.store_id || '');
  const [town, setTown] = useState(preorder?.town || '');
  const [general, setGeneral] = useState(preorder?.general_quantity ? String(preorder.general_quantity) : '');
  const [qty, setQty] = useState(preorder ? itemsToMap(preorder.items) : {});
  const [status, setStatus] = useState(preorder?.status || 'open');
  const [notes, setNotes] = useState(preorder?.notes || '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const items = mapToItems(qty);
  const generalQty = Number(general) || 0;
  const units = generalQty + sumQty(items);

  const submit = async () => {
    setSaving(true);
    const res = await save('preorders', {
      preorder_date: date, store_id: storeId, town: storeId ? '' : town.trim(),
      general_quantity: generalQty, items, total_units: units, status, notes,
    }, preorder?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      wide
      title={preorder ? t('עריכת הזמנה מראש', 'Edit preorder') : t('הזמנה מראש חדשה', 'New preorder')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={units > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('חנות (לא חובה)', 'Store (optional)')}>
          <div className="flex gap-1">
            <div className="min-w-0 flex-1">
              <StoreCombobox stores={data.stores} value={storeId} onChange={setStoreId} placeholder={t('ללא חנות', 'No store')} />
            </div>
            {storeId && (
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setStoreId('')} title={t('הסרת החנות', 'Clear store')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Field>
        {storeId ? (
          <Field label={t('עיר', 'Town')}><p className="pt-2 text-sm">{model.storeById[storeId]?.town || '—'}</p></Field>
        ) : (
          <Field label={t('עיר', 'Town')}>
            <Input list="preorder-towns" value={town} onChange={(e) => setTown(e.target.value)} />
            <datalist id="preorder-towns">{ISRAELI_TOWNS.map((x) => <option key={x} value={x} />)}</datalist>
          </Field>
        )}
      </div>
      <Field label={t('כמות כללית (בלי מספר מסוים)', 'General quantity (no specific number)')}>
        <Input
          type="text" inputMode="numeric" dir="ltr" className="max-w-40" value={general}
          onChange={(e) => setGeneral(e.target.value.replace(/\D/g, ''))}
        />
      </Field>
      <Field label={t('מספרים ספציפיים', 'Specific numbers')}>
        <QtyGrid entries={model.catalog} value={qty} onChange={setQty} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('סטטוס', 'Status')}>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{t(s.he, s.en)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('סיכום', 'Summary')}><p className="pt-2 text-sm"><b>{units}</b> {t('יחידות', 'units')}</p></Field>
      </div>
      <Field label={t('הערות', 'Notes')}><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </FormDialog>
  );
}