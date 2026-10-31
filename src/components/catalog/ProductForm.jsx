import React, { useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import ViolationAlert from '@/components/shared/ViolationAlert';
import SerialBadge from '@/components/shared/SerialBadge';
import { dataLayer } from '@/data/dataLayer';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';

export default function ProductForm({ entry, onClose }) {
  const { t } = useLang();
  const { saveProduct } = useActions();
  const fileInput = useRef(null);
  const p = entry.product || {};
  const [v, setV] = useState({
    name: p.name || '',
    name_en: p.name_en || '',
    file_link: p.file_link || '',
    distribution_paused: p.distribution_paused === true,
    not_for_sale: p.not_for_sale === true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fail, setFail] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setFail(null);
    try {
      const fileLink = await dataLayer.uploadPrivateFile(file);
      setV((previous) => ({ ...previous, file_link: fileLink }));
    } catch (error) {
      setFail({ message: t(`העלאת הקובץ נכשלה: ${error.message}`, `File upload failed: ${error.message}`) });
    } finally {
      setUploading(false);
    }
  };

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
      onClose={onClose} onSubmit={submit} saving={saving || uploading} error={fail && <ViolationAlert result={fail} />}
    >
      <Field label={t('שם (עברית)', 'Name (Hebrew)')}><Input value={v.name} onChange={set('name')} /></Field>
      <Field label={t('שם באנגלית', 'English name')}><Input dir="ltr" value={v.name_en} onChange={set('name_en')} /></Field>
      <Field label={t('תמונת או קובץ הפריט', 'Item image or file')} hint={v.file_link || t('אפשר לבחור תמונה או PDF מהמחשב.', 'Choose an image or PDF from this computer.')}>
        <div className="flex gap-2">
          <Input dir="ltr" value={v.file_link} onChange={set('file_link')} placeholder={t('קישור אינטרנט או הפניה לקובץ', 'Web link or file reference')} />
          <input ref={fileInput} type="file" accept="image/*,.pdf" className="hidden" onChange={chooseFile} />
          <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
            <ImageUp className="h-4 w-4" />
            {uploading ? t('מעלה...', 'Uploading...') : t('בחירת קובץ', 'Browse files')}
          </Button>
        </div>
      </Field>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
        <Checkbox checked={v.distribution_paused} onCheckedChange={(checked) => setV((previous) => ({ ...previous, distribution_paused: checked === true }))} />
        <span>
          <span className="block font-medium">{t('לא להפצה כרגע', 'Not currently distributed')}</span>
          <span className="block text-xs text-muted-foreground">{t('לא ייבחר אוטומטית לחבילות; אספקה ידנית תציג אזהרה.', 'Excluded from automatic packages; manual deliveries show an override warning.')}</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-destructive/30 p-3 text-sm">
        <Checkbox checked={v.not_for_sale} onCheckedChange={(checked) => setV((previous) => ({ ...previous, not_for_sale: checked === true }))} />
        <span>
          <span className="block font-medium">{t('לא למכירה', 'Not for sale')}</span>
          <span className="block text-xs text-muted-foreground">{t('הפריט לא ייכלל בחבילות או באספקות חדשות. דיווחים על מלאי שכבר בחנות יישארו ללא שינוי.', 'Blocked from new packages and deliveries. Sales and returns already recorded for store stock are unaffected.')}</span>
        </span>
      </label>
    </FormDialog>
  );
}