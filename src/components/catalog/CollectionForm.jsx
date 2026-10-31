import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import SerialBadge from '@/components/shared/SerialBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { rgbFromHex, toneFromColor, TONES } from '@/lib/logic/serials';

export default function CollectionForm({ collection, onClose, onDelete }) {
  const { t } = useLang();
  const { saveCollection } = useActions();
  const initialColor = toneFromColor(collection?.tone)?.bg || TONES.find((tone) => tone.key === collection?.tone)?.bg || '#FBD5E0';
  const [v, setV] = useState({
    name: collection?.name || '', name_en: collection?.name_en || '',
    serial_from: collection?.serial_from ?? '', serial_to: collection?.serial_to ?? '',
    tone: collection?.tone || '',
  });
  const [color, setColor] = useState(initialColor);
  const [hex, setHex] = useState(initialColor);
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const rgb = rgbFromHex(color);

  const setColorValue = (value) => {
    const tone = toneFromColor(value);
    if (!tone) return;
    setColor(tone.bg);
    setHex(tone.bg);
    setV((previous) => ({ ...previous, tone: tone.bg }));
  };

  const setChannel = (channel) => (event) => {
    const value = event.target.value;
    if (value === '') return;
    const next = { ...rgb, [channel]: Math.max(0, Math.min(255, Number(value))) };
    setColorValue(`#${[next.r, next.g, next.b].map((part) => part.toString(16).padStart(2, '0')).join('')}`);
  };

  const setHexValue = (event) => {
    const value = event.target.value;
    setHex(value);
    if (toneFromColor(value)) setColorValue(value);
  };

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
      canSubmit={!!v.name && v.serial_from !== '' && v.serial_to !== '' && (!v.tone || !!toneFromColor(hex))}
      error={fail && <ViolationAlert result={fail} />}
    >
      {collection && onDelete && (
        <div className="flex justify-start border-b pb-4">
          <Button type="button" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            {t('מחיקת האוסף', 'Delete collection')}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('שם (עברית)', 'Name (Hebrew)')}><Input value={v.name} onChange={set('name')} /></Field>
        <Field label={t('שם באנגלית', 'English name')}><Input dir="ltr" value={v.name_en} onChange={set('name_en')} /></Field>
        <Field label={t('ממספר', 'From number')}><Input type="number" dir="ltr" value={v.serial_from} onChange={set('serial_from')} /></Field>
        <Field label={t('עד מספר', 'To number')}><Input type="number" dir="ltr" value={v.serial_to} onChange={set('serial_to')} /></Field>
      </div>
      <Field label={t('צבע המספרים', 'Number color')} hint={t('בחרו כל צבע בעזרת בורר הצבעים או הזינו ערכי HEX ו-RGB. הצבע יחול על כל המספרים באוסף.', 'Choose any color with the picker or enter HEX and RGB values. It applies to every number in this collection.')}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={!v.tone}
            onClick={() => setV((previous) => ({ ...previous, tone: '' }))}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!v.tone ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-border'}`}
          >
            {t('אוטומטי', 'Automatic')}
          </button>
          <label className="flex h-10 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-card p-1" title={t('בחרו צבע', 'Choose color')}>
            <input aria-label={t('בחרו צבע', 'Choose color')} type="color" value={color} onChange={(event) => setColorValue(event.target.value)} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              HEX
              <Input aria-label="HEX" dir="ltr" value={hex} onChange={setHexValue} className="h-9 w-24 px-2 font-mono" />
            </label>
            {['r', 'g', 'b'].map((channel) => (
              <label key={channel} className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                {channel}
                <Input aria-label={`RGB ${channel.toUpperCase()}`} type="number" min="0" max="255" dir="ltr" value={rgb?.[channel] ?? 0} onChange={setChannel(channel)} className="h-9 w-16 px-2 text-center" />
              </label>
            ))}
          </div>
          <SerialBadge serial={v.serial_from || '?'} size="sm" className="h-8 min-w-8" tone={v.tone ? toneFromColor(color) : undefined} />
        </div>
      </Field>
    </FormDialog>
  );
}