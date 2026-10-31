import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { ISRAELI_TOWNS } from '@/lib/logic/towns';
import { useAppData } from '@/hooks/useAppData';

export default function StoreForm({ store, onClose }) {
  const { t } = useLang();
  const { data } = useAppData();
  const { save } = useActions();
  const [v, setV] = useState({
    name: store?.name || '', town: store?.town || '', address: store?.address || '',
    contact_person: store?.contact_person || '', phone: store?.phone || '',
    payment_model: store?.payment_model || 'consignment', is_active: store?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async () => {
    setSaving(true);
    const res = await save('stores', v, store?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      title={store ? t('עריכת חנות', 'Edit store') : t('חנות חדשה', 'New store')}
      onClose={onClose} onSubmit={submit} saving={saving} canSubmit={!!v.name && !!v.town}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('שם החנות', 'Store name')}><Input value={v.name} onChange={set('name')} /></Field>
        <Field label={t('עיר', 'Town')}>
          <Input list="towns-list" value={v.town} onChange={set('town')} />
          <datalist id="towns-list">{[...new Set([...ISRAELI_TOWNS, ...(data.towns || []).map((town) => town.name)])].map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <Field label={t('כתובת', 'Address')}><Input value={v.address} onChange={set('address')} /></Field>
        <Field label={t('איש קשר', 'Contact')}><Input value={v.contact_person} onChange={set('contact_person')} /></Field>
        <Field label={t('טלפון', 'Phone')}><Input dir="ltr" value={v.phone} onChange={set('phone')} /></Field>
        <Field label={t('מודל תשלום', 'Payment model')}>
          <Select value={v.payment_model} onValueChange={(x) => setV({ ...v, payment_model: x })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="consignment">{t('תשלום לפי מכירה', 'Consignment')}</SelectItem>
              <SelectItem value="invoice">{t('חשבונית באספקה', 'Invoice on delivery')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={v.is_active} onCheckedChange={(x) => setV({ ...v, is_active: x })} />
        {t('חנות פעילה', 'Active store')}
      </label>
    </FormDialog>
  );
}