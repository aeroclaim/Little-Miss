import React, { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import SerialBadge from '@/components/shared/SerialBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useLang } from '@/lib/lang';

export default function CatalogBulkEditDialog({ entries, towns, onClose, onApply, saving }) {
  const { t } = useLang();
  const [saleStatus, setSaleStatus] = useState('unchanged');
  const [distributionStatus, setDistributionStatus] = useState('unchanged');
  const [townAction, setTownAction] = useState('none');
  const [selectedTowns, setSelectedTowns] = useState(new Set());
  const [fail, setFail] = useState(null);
  const serials = useMemo(() => entries.map((entry) => entry.serial).sort((a, b) => a - b), [entries]);

  const toggleTown = (name) => {
    setSelectedTowns((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const canApply = saleStatus !== 'unchanged' || distributionStatus !== 'unchanged' ||
    (townAction !== 'none' && selectedTowns.size > 0);

  const submit = async () => {
    setFail(null);
    const changes = {
      ...(saleStatus !== 'unchanged' ? { not_for_sale: saleStatus === 'not_for_sale' } : {}),
      ...(distributionStatus !== 'unchanged' ? { distribution_paused: distributionStatus === 'paused' } : {}),
      ...(townAction !== 'none' ? { townAction, townNames: [...selectedTowns] } : {}),
    };
    const result = await onApply(serials, changes);
    if (result.ok) onClose();
    else setFail(result);
  };

  return (
    <FormDialog
      wide
      title={t(`הגדרה מרובה של ${serials.length} פריטים`, `Configure ${serials.length} selected items`)}
      description={t('בדקו את הפריטים ואת השינויים לפני השמירה. שדות שלא תשנו יישארו ללא שינוי.', 'Review the selected items and changes before saving. Fields you leave unchanged will not be modified.')}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      canSubmit={canApply}
      submitLabel={t('החלת השינויים', 'Apply changes')}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="max-h-32 overflow-y-auto rounded-xl border bg-muted/30 p-3">
        <p className="mb-2 text-sm font-medium">{t('הפריטים שנבחרו', 'Selected items')}</p>
        <div className="flex flex-wrap gap-1.5">{serials.map((serial) => <SerialBadge key={serial} serial={serial} size="sm" />)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('חסימה לאספקה חדשה', 'Block from new deliveries')}>
          <Select value={saleStatus} onValueChange={setSaleStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unchanged">{t('ללא שינוי', 'No change')}</SelectItem>
              <SelectItem value="not_for_sale">{t('חסימה', 'Blocked')}</SelectItem>
              <SelectItem value="for_sale">{t('פתוח לאספקה', 'Available for delivery')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('הפצה אוטומטית', 'Automatic distribution')}>
          <Select value={distributionStatus} onValueChange={setDistributionStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unchanged">{t('ללא שינוי', 'No change')}</SelectItem>
              <SelectItem value="paused">{t('השהיית הפצה אוטומטית', 'Pause automatic distribution')}</SelectItem>
              <SelectItem value="active">{t('חידוש הפצה אוטומטית', 'Resume automatic distribution')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={t('שיוך מספרים לערים', 'Assign numbers to towns')}>
        <Select value={townAction} onValueChange={setTownAction}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('ללא שינוי', 'No change')}</SelectItem>
            <SelectItem value="assign">{t('הוספת המספרים הנבחרים לערים', 'Add selected numbers to towns')}</SelectItem>
            <SelectItem value="remove">{t('הסרת המספרים הנבחרים מערים', 'Remove selected numbers from towns')}</SelectItem>
          </SelectContent>
        </Select>
        {townAction !== 'none' && (
          <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
            {towns.map((town) => (
              <label key={town.id || town.name} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={selectedTowns.has(town.name)} onCheckedChange={() => toggleTown(town.name)} />
                <span>{town.name}</span>
              </label>
            ))}
            {!towns.length && <span className="text-sm text-muted-foreground">{t('אין ערים שמורות.', 'No saved towns.')}</span>}
          </div>
        )}
      </Field>
      <p className="text-xs text-muted-foreground">
        {t('חסימה מונעת רק יצירה של חבילות ואספקות חדשות. דיווחי מכירות והחזרות על מלאי שכבר נמצא בחנויות יישארו ללא שינוי. פריטים השמורים בחבילות מוכנות לא ניתנים לחסימה עד לביטול החבילות.', 'Blocking only prevents new packages and deliveries. Sales and returns already recorded for store stock are unaffected. Items reserved in ready packages cannot be blocked until those packages are cancelled.')}
      </p>
    </FormDialog>
  );
}
