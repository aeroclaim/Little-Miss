import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';

export default function CollectionForm({ collection, onClose }) {
  const { t } = useLang();
  const { saveCollection } = useActions();
  const [v, setV] = useState({
    name: collection?.name || '', name_en: collection?.name_en || '',
    serial_from: collection?.serial_from ?? '', serial_to: collection?.serial_to ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async () => {
    setSaving(true);
    const res = await saveCollection(v, collection?.id);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      title={collection ? t('עריכת אוסף', 'Edit collection') : t('אוסף חדש', 'New collection')}
      onClose={onClose} onSubmit={submit} saving={saving}
      canSubmit={!!v.name && v.serial_from !== '' && v.serial_to !== ''}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('שם (עברית)', 'Name (Hebrew)')}><Input value={v.name} onChange={set('name')} /></Field>
        <Field label={t('שם באנגלית', 'English name')}><Input dir="ltr" value={v.name_en} onChange={set('name_en')} /></Field>
        <Field label={t('ממספר', 'From number')}><Input type="number" dir="ltr" value={v.serial_from} onChange={set('serial_from')} /></Field>
        <Field label={t('עד מספר', 'To number')}><Input type="number" dir="ltr" value={v.serial_to} onChange={set('serial_to')} /></Field>
      </div>
    </FormDialog>
  );
}