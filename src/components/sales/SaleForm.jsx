import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import QtyGrid from '@/components/shared/QtyGrid';
import StoreCombobox from '@/components/shared/StoreCombobox';
import ModelBadge from '@/components/shared/ModelBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { shelfLimits } from '@/lib/logic/inventory';
import { itemsToMap, mapToItems } from '@/lib/logic/items';
import { priceSale } from '@/lib/logic/pricing';
import { sumQty, todayISO } from '@/lib/logic/format';

export default function SaleForm({ sale, defaultStoreId, onClose }) {
  const { t, money } = useLang();
  const { data, model } = useAppData();
  const { save } = useActions();
  const [storeId, setStoreId] = useState(sale?.store_id || defaultStoreId || '');
  const [date, setDate] = useState(sale?.sale_date || todayISO());
  const [qty, setQty] = useState(sale ? itemsToMap(sale.items) : {});
  const [manual, setManual] = useState(sale ? (sale.unit_price ?? '') : '');
  const [notes, setNotes] = useState(sale?.notes || '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const store = model.storeById[storeId];
  const original = sale && storeId === sale.store_id ? itemsToMap(sale.items) : {};
  const limits = shelfLimits(model.storeStats[storeId], original);
  const entries = model.catalog.filter((e) => (limits[e.serial] || 0) > 0);
  const invoice = store?.payment_model === 'invoice';
  const defaultUnit = invoice ? 0 : model.finance[storeId]?.consignmentUnitPrice || 0;
  const items = mapToItems(qty);
  const units = sumQty(items);
  const price = priceSale(defaultUnit, units, manual);

  const changeStore = (id) => {
    setStoreId(id);
    setQty({});
    setManual('');
  };

  const submit = async () => {
    setSaving(true);
    const res = await save('sales', {
      store_id: storeId, sale_date: date, items, total_units: units,
      unit_price: price.unit_price, total_value: price.total_value, notes,
    }, sale?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      wide
      title={sale ? t('עריכת דיווח מכירה', 'Edit sales report') : t('דיווח מכירה חדש', 'New sales report')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!storeId && units > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('חנות', 'Store')}><StoreCombobox stores={data.stores} value={storeId} onChange={changeStore} /></Field>
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {store && <ModelBadge model={store.payment_model} />}
      <Field label={t('מה נמכר (בכתב אפור: כמות על המדף)', 'What was sold (grey: on the shelf)')}>
        <QtyGrid
          entries={entries} value={qty} onChange={setQty} limits={limits}
          emptyText={storeId ? t('אין מלאי על המדף של החנות.', 'This store has nothing on its shelf.') : t('בחרו חנות קודם.', 'Select a store first.')}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('מחיר ליחידה (ריק = מחיר האספקות)', 'Unit price (empty = delivery price)')}
          hint={invoice ? t('החנות מחויבת בעת האספקה, ולכן מכירה לא מוסיפה חיוב.', 'This store is invoiced on delivery, so a sale adds no charge.') : undefined}
        >
          <Input type="number" step="0.01" dir="ltr" value={manual} placeholder={String(defaultUnit)} onChange={(e) => setManual(e.target.value)} />
        </Field>
        <Field label={t('סיכום', 'Summary')}>
          <p className="pt-2 text-sm">{units} {t('יחידות', 'units')} · {money(price.unit_price)} · <b>{money(price.total_value)}</b></p>
        </Field>
      </div>
      <Field label={t('הערות', 'Notes')}><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </FormDialog>
  );
}