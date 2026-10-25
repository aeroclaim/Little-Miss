import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import QtyGrid from '@/components/shared/QtyGrid';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { itemsToMap, mapToItems, mapTotal } from '@/lib/logic/items';
import { derivePrinting } from '@/lib/logic/pricing';
import { todayISO } from '@/lib/logic/format';

export default function PrintOrderForm({ order, onClose }) {
  const { t, money } = useLang();
  const { model } = useAppData();
  const { save } = useActions();
  const [date, setDate] = useState(order?.order_date || todayISO());
  const [provider, setProvider] = useState(order?.provider || '');
  const [reference, setReference] = useState(order?.reference || '');
  const [qty, setQty] = useState(order ? itemsToMap(order.items) : {});
  const [total, setTotal] = useState(order?.total_price ?? '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const copies = mapTotal(qty);
  const price = derivePrinting({ mode: 'total', value: total, copies });

  const submit = async () => {
    setSaving(true);
    const res = await save('printOrders', {
      order_date: date, provider, reference, items: mapToItems(qty),
      total_copies: copies, total_price: price.total, price_per_unit: price.unit,
    }, order?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      wide title={order ? t('עריכת הזמנת הדפסה', 'Edit print order') : t('הזמנת הדפסה חדשה', 'New print order')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!provider && copies > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('בית דפוס', 'Print house')}><Input value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
        <Field label={t('אסמכתא', 'Reference')}><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      <Field label={t('כמות לכל מספר', 'Copies per number')}><QtyGrid entries={model.catalog} value={qty} onChange={setQty} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('מחיר כולל (₪)', 'Total price (ILS)')}><Input type="number" dir="ltr" value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
        <Field label={t('סיכום', 'Summary')}>
          <p className="pt-2 text-sm">{copies} {t('עותקים', 'copies')} · {money(price.unit, 3)} {t('ליחידה', 'per unit')}</p>
        </Field>
      </div>
    </FormDialog>
  );
}