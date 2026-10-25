import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import QtyGrid from '@/components/shared/QtyGrid';
import StoreCombobox from '@/components/shared/StoreCombobox';
import ModelBadge from '@/components/shared/ModelBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { itemsToMap, mapToItems, mapTotal } from '@/lib/logic/items';
import { priceDelivery } from '@/lib/logic/pricing';
import { todayISO } from '@/lib/logic/format';

export default function DeliveryForm({ delivery, defaultStoreId, onClose }) {
  const { t, money } = useLang();
  const { data, model } = useAppData();
  const { save } = useActions();
  const [storeId, setStoreId] = useState(delivery?.store_id || defaultStoreId || '');
  const [date, setDate] = useState(delivery?.delivery_date || todayISO());
  const [reference, setReference] = useState(delivery?.reference || '');
  const [qty, setQty] = useState(delivery ? itemsToMap(delivery.items) : {});
  const [manual, setManual] = useState(delivery?.price_source === 'manual' ? delivery.unit_price : '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const store = model.storeById[storeId];
  const original = delivery ? itemsToMap(delivery.items) : {};
  const limits = {};
  for (const e of model.catalog) limits[e.serial] = (model.stock[e.serial]?.available || 0) + (original[e.serial] || 0);
  const units = mapTotal(qty);
  const price = priceDelivery(data.priceTiers, units, manual);
  const paymentModel = delivery?.payment_model || store?.payment_model || 'consignment';

  const submit = async () => {
    setSaving(true);
    const res = await save('deliveries', {
      store_id: storeId, delivery_date: date, payment_model: paymentModel, items: mapToItems(qty),
      total_units: units, unit_price: price.unit_price, price_source: price.source,
      tier_batch_size: price.tier?.batch_size, total_value: price.total_value, reference,
    }, delivery?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      wide title={delivery ? t('עריכת אספקה', 'Edit delivery') : t('אספקה חדשה', 'New delivery')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!storeId && units > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('חנות', 'Store')}><StoreCombobox stores={data.stores} value={storeId} onChange={setStoreId} /></Field>
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('תעודת משלוח', 'Delivery note')}><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      {storeId && <ModelBadge model={paymentModel} />}
      <Field label={t('כמויות (בכתב אפור: מלאי פנוי)', 'Quantities (placeholder: free stock)')}>
        <QtyGrid entries={model.catalog} value={qty} onChange={setQty} limits={limits} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('מחיר ליחידה ידני (ריק = לפי מדרגות)', 'Manual unit price (empty = tier)')}>
          <Input type="number" dir="ltr" value={manual} onChange={(e) => setManual(e.target.value)} />
        </Field>
        <Field label={t('סיכום', 'Summary')}>
          <p className="pt-2 text-sm">{units} {t('יחידות', 'units')} · {money(price.unit_price)} · <b>{money(price.total_value)}</b></p>
        </Field>
      </div>
    </FormDialog>
  );
}