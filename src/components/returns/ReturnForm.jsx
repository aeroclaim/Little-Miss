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
import { shelfLimits } from '@/lib/logic/inventory';
import { itemsToMap, returnItems } from '@/lib/logic/items';
import { round2, sumQty, todayISO } from '@/lib/logic/format';

export default function ReturnForm({ ret, defaultStoreId, onClose }) {
  const { t, money } = useLang();
  const { data, model } = useAppData();
  const { save } = useActions();
  const [storeId, setStoreId] = useState(ret?.store_id || defaultStoreId || '');
  const [date, setDate] = useState(ret?.return_date || todayISO());
  const [qty, setQty] = useState(ret ? itemsToMap(ret.items) : {});
  const [faulty, setFaulty] = useState(ret ? itemsToMap(ret.items, 'faulty_quantity') : {});
  const [reason, setReason] = useState(ret?.reason || '');
  const [credit, setCredit] = useState(ret ? (ret.credit_value ?? '') : '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const store = model.storeById[storeId];
  const original = ret && storeId === ret.store_id ? itemsToMap(ret.items) : {};
  const limits = shelfLimits(model.storeStats[storeId], original);
  const entries = model.catalog.filter((e) => (limits[e.serial] || 0) > 0);
  const items = returnItems(qty, faulty);
  const units = sumQty(items);
  const faultyUnits = sumQty(items, 'faulty_quantity');
  const returned = Object.fromEntries(items.map((it) => [it.serial_number, it.quantity]));
  const invoice = store?.payment_model === 'invoice';
  const autoCredit = invoice ? round2(units * (model.finance[storeId]?.invoiceUnitPrice || 0)) : 0;
  const creditValue = credit !== '' && Number(credit) >= 0 ? round2(Number(credit)) : autoCredit;

  const changeStore = (id) => {
    setStoreId(id);
    setQty({});
    setFaulty({});
    setCredit('');
  };

  const submit = async () => {
    setSaving(true);
    const res = await save('returns', {
      store_id: storeId, return_date: date, items, total_units: units, faulty_units: faultyUnits,
      credit_value: creditValue, reason,
    }, ret?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      wide
      title={ret ? t('עריכת החזרה', 'Edit return') : t('החזרה חדשה', 'New return')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!storeId && units > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('חנות', 'Store')}><StoreCombobox stores={data.stores} value={storeId} onChange={changeStore} /></Field>
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('סיבה', 'Reason')}><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      {store && <ModelBadge model={store.payment_model} />}
      <Field label={t('כמויות שהוחזרו (בכתב אפור: כמות על המדף)', 'Returned quantities (grey: on the shelf)')}>
        <QtyGrid
          entries={entries} value={qty} onChange={setQty} limits={limits}
          emptyText={storeId ? t('אין מלאי על המדף של החנות.', 'This store has nothing on its shelf.') : t('בחרו חנות קודם.', 'Select a store first.')}
        />
      </Field>
      {units > 0 && (
        <Field label={t('מתוכן תקולים (לא חוזרים למלאי)', 'Of which faulty (not returned to stock)')}>
          <QtyGrid entries={entries.filter((e) => returned[e.serial])} value={faulty} onChange={setFaulty} limits={returned} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('זיכוי לחנות (₪, ריק = אוטומטי)', 'Credit to the store (ILS, empty = automatic)')}
          hint={invoice ? t('חנות בחשבונית: זיכוי אוטומטי לפי מחיר האספקות.', 'Invoice store: automatic credit at the delivery price.') : t('חנות בקונסיגנציה: אין זיכוי כברירת מחדל.', 'Consignment store: no credit by default.')}
        >
          <Input type="number" step="0.01" dir="ltr" value={credit} placeholder={String(autoCredit)} onChange={(e) => setCredit(e.target.value)} />
        </Field>
        <Field label={t('סיכום', 'Summary')}>
          <p className="pt-2 text-sm">{units} {t('יחידות', 'units')} · {faultyUnits} {t('תקולים', 'faulty')} · {t('זיכוי', 'credit')} <b>{money(creditValue)}</b></p>
        </Field>
      </div>
    </FormDialog>
  );
}