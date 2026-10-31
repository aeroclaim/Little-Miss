import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import SerialBadge from '@/components/shared/SerialBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { collectionLabel } from '@/lib/logic/serials';

export default function TownAssignmentsDialog({ town, onClose, creating = false }) {
  const { t, lang } = useLang();
  const { data, model } = useAppData();
  const { saveTown } = useActions();
  const saved = (data.towns || []).find((entry) => entry.name === town);
  const [name, setName] = useState(town || '');
  const [notes, setNotes] = useState(saved?.notes || '');
  const [assigned, setAssigned] = useState(() => new Set(saved?.assigned_serials || []));
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);
  const groups = useMemo(() => {
    const byCollection = new Map();
    for (const entry of model.catalog) {
      const key = entry.collection?.id || '__uncategorized';
      if (!byCollection.has(key)) byCollection.set(key, { key, collection: entry.collection, entries: [] });
      byCollection.get(key).entries.push(entry);
    }
    return [...byCollection.values()];
  }, [model.catalog]);

  const toggleSerial = (serial) => {
    setAssigned((current) => {
      const next = new Set(current);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };

  const toggleGroup = (entries) => {
    const serials = entries.map((entry) => entry.serial);
    const checked = serials.every((serial) => assigned.has(serial));
    setAssigned((current) => {
      const next = new Set(current);
      for (const serial of serials) {
        if (checked) next.delete(serial);
        else next.add(serial);
      }
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    const result = await saveTown(name, { notes, assigned_serials: [...assigned] });
    setSaving(false);
    if (result.ok) onClose();
    else setFail(result);
  };

  return (
    <FormDialog
      wide
      title={creating ? t('הוספת עיר', 'Add town') : t(`הגדרות ${town}`, `${town} settings`)}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      canSubmit={!!name.trim()}
      error={fail && <ViolationAlert result={fail} />}
    >
      {creating && <Field label={t('שם העיר', 'Town name')}><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>}
      <Field label={t('הערות לעיר', 'Town notes')}>
        <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <Field label={t('מספרים ייחודיים לעיר', 'Numbers assigned to this town')} hint={t('בחירת אוסף מוסיפה או מסירה את כל המספרים בו. ניתן לשנות כל מספר בנפרד לאחר מכן.', 'Selecting a collection adds or removes its entire range. Individual numbers can then be toggled. Numbers may be shared by towns.')}>
        <div className="space-y-4">
          {groups.map((group) => {
            const serials = group.entries.map((entry) => entry.serial);
            const checked = serials.every((serial) => assigned.has(serial));
            const partial = !checked && serials.some((serial) => assigned.has(serial));
            return (
              <section key={group.key} className="rounded-xl border p-3">
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={partial ? 'indeterminate' : checked} onCheckedChange={() => toggleGroup(group.entries)} />
                  {collectionLabel(group.collection, lang)}
                  <span className="text-xs font-normal text-muted-foreground">({serials.length})</span>
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                  {group.entries.map((entry) => (
                    <label key={entry.serial} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5">
                      <Checkbox checked={assigned.has(entry.serial)} onCheckedChange={() => toggleSerial(entry.serial)} />
                      <SerialBadge serial={entry.serial} size="sm" />
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Field>
    </FormDialog>
  );
}
