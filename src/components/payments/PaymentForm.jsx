import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import StoreCombobox from '@/components/shared/StoreCombobox';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { PAYMENT_METHODS } from '@/lib/logic/options';
import { round2, todayISO } from '@/lib/logic/format';

export default function PaymentForm({ payment, defaultStoreId, onClose }) {
  const { t, money } = useLang();
  const { data, model } = useAppData();
  const { save } = useActions();
  const owed = (id) => Math.max(0, model.finance[id]?.balance || 0);
  const suggest = (id) => (owed(id) ? String(owed(id)) : '');
  const [storeId, setStoreId] = useState(payment?.store_id || defaultStoreId || '');
  const [date, setDate] = useState(payment?.payment_date || todayISO());
  const [amount, setAmount] = useState(payment ? String(payment.amount) : suggest(defaultStoreId));
  const [method, setMethod] = useState(payment?.method || 'bank_transfer');
  const [reference, setReference] = useState(payment?.reference || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const balance = model.finance[storeId]?.balance || 0;

  const changeStore = (id) => {
    setStoreId(id);
    if (!payment) setAmount(suggest(id));
  };

  const submit = async () => {
    setSaving(true);
    const res = await save('payments', {
      store_id: storeId, payment_date: date, amount: round2(Number(amount)), method, reference, notes,
    }, payment?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      title={payment ? t('עריכת תשלום', 'Edit payment') : t('תשלום חדש', 'New payment')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!storeId && Number(amount) > 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('חנות', 'Store')}><StoreCombobox stores={data.stores} value={storeId} onChange={changeStore} /></Field>
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field
          label={t('סכום (₪)', 'Amount (ILS)')}
          hint={storeId ? t(`יתרת חוב נוכחית: ${money(balance)}`, `Current balance: ${money(balance)}`) : undefined}
        >
          <Input type="number" step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t('אמצעי תשלום', 'Payment method')}>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{t(m.he, m.en)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={t('אסמכתא (מספר צ׳ק / העברה)', 'Reference (check / transfer number)')}>
        <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Field label={t('הערות', 'Notes')}><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </FormDialog>
  );
}