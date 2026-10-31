import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import { useLang } from '@/lib/lang';

export default function PackageBatchForm({ towns, onClose, onCreate, saving }) {
  const { t } = useLang();
  const townOptions = towns
    .map((town) => ({ name: String(town.name || town.town || '').trim() }))
    .filter((town, index, list) => town.name && list.findIndex((entry) => entry.name === town.name) === index);
  const [counts, setCounts] = useState(() => Object.fromEntries(townOptions.map((town) => [town.name, '0'])));
  const selected = townOptions.filter((town) => Number(counts[town.name]) > 0);
  const total = selected.reduce((sum, town) => sum + Number(counts[town.name]), 0);

  return (
    <FormDialog
      title={t('תכנון חבילות חדשות', 'Plan a package batch')}
      description={t('בחרו כמה חבילות להכין לכל עיר.', 'Choose how many packages to prepare for each town.')}
      onClose={onClose}
      onSubmit={() => onCreate(selected.map((town) => ({ town: town.name, count: Math.floor(Number(counts[town.name])) })))}
      saving={saving}
      canSubmit={total > 0}
    >
      <Field label={t('חבילות לפי עיר', 'Packages per town')}>
        <div className="space-y-2">
          {townOptions.map((town) => (
            <label key={town.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="font-medium">{town.name}</span>
              <Input
                type="number"
                min="0"
                step="1"
                dir="ltr"
                value={counts[town.name] ?? '0'}
                onChange={(event) => {
                  const value = event.target.value;
                  const integer = value === '' ? '' : String(Math.max(0, Math.floor(Number(value) || 0)));
                  setCounts((current) => ({ ...current, [town.name]: integer }));
                }}
                onBlur={() => setCounts((current) => ({ ...current, [town.name]: String(Math.max(0, Math.floor(Number(current[town.name]) || 0))) }))}
                className="h-9 w-24 text-center"
                aria-label={t(`מספר חבילות בעיר ${town.name}`, `Packages for ${town.name}`)}
              />
            </label>
          ))}
          {!townOptions.length && <p className="text-sm text-muted-foreground">{t('הוסיפו עיר לפני תכנון חבילות.', 'Add a town before planning packages.')}</p>}
        </div>
      </Field>
      <p className="rounded-lg bg-muted/50 p-3 text-sm font-medium">
        {t(`סה״כ ${total} חבילות`, `${total} packages total`)}
      </p>
    </FormDialog>
  );
}
