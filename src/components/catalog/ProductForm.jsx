import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import ViolationAlert from '@/components/shared/ViolationAlert';
import SerialBadge from '@/components/shared/SerialBadge';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';

export default function ProductForm({ entry, onClose }) {
  const { t } = useLang();
  const { saveProduct } = useActions();
  const p = entry.product || {};
  const [v, setV] = useState({ name: p.name || '', name_en: p.name_en || '', file_link: p.file_link || '' });
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async () => {
    setSaving(true);
    const res = await saveProduct(entry.serial, v);
    setSaving(false);
    if (res.ok) onClose();
    else setFail(res);
  };

  return (
    <FormDialog
      title={<span className="flex items-center gap-3">{t('מספר', 'Number')} <SerialBadge serial={entry.serial} /></span>}
      onClose={onClose} onSubmit={submit} saving={saving} error={fail && <ViolationAlert result={fail} />}
    >
      <Field label={t('שם (עברית)', 'Name (Hebrew)')}><Input value={v.name} onChange={set('name')} /></Field>
      <Field label={t('שם באנגלית', 'English name')}><Input dir="ltr" value={v.name_en} onChange={set('name_en')} /></Field>
      <Field label={t('קישור לקובץ', 'File link')}><Input dir="ltr" value={v.file_link} onChange={set('file_link')} /></Field>
    </FormDialog>
  );
}