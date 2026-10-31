import React, { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import Field from '@/components/shared/Field';
import QtyGrid from '@/components/shared/QtyGrid';
import StoreCombobox from '@/components/shared/StoreCombobox';
import ModelBadge from '@/components/shared/ModelBadge';
import SerialBadge from '@/components/shared/SerialBadge';
import ViolationAlert from '@/components/shared/ViolationAlert';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { combineItemLists, itemsToMap, mapToItems, mapTotal } from '@/lib/logic/items';
import { priceDelivery } from '@/lib/logic/pricing';
import { todayISO } from '@/lib/logic/format';

export default function DeliveryForm({ delivery, defaultStoreId, onClose }) {
  const { t, money } = useLang();
  const { data, model } = useAppData();
  const { save, issuePackages } = useActions();
  const initialPackageIds = delivery?.package_ids || (delivery?.package_id ? [delivery.package_id] : []);
  const [storeId, setStoreId] = useState(delivery?.store_id || defaultStoreId || '');
  const [date, setDate] = useState(delivery?.delivery_date || todayISO());
  const [reference, setReference] = useState(delivery?.reference || '');
  const [selectedPackageIds, setSelectedPackageIds] = useState(initialPackageIds);
  const [manualQty, setManualQty] = useState(() => {
    if (delivery?.manual_items) return itemsToMap(delivery.manual_items);
    return initialPackageIds.length ? {} : itemsToMap(delivery?.items);
  });
  const [manual, setManual] = useState(delivery?.price_source === 'manual' ? delivery.unit_price : '');
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(null);

  const store = model.storeById[storeId];
  const packageOptions = (data.packages || []).filter((pkg) =>
    pkg.status === 'ready' || selectedPackageIds.includes(pkg.id)
  );
  const selectedPackages = useMemo(
    () => selectedPackageIds.map((id) => (data.packages || []).find((pkg) => pkg.id === id)).filter(Boolean),
    [data.packages, selectedPackageIds]
  );
  const packageQty = useMemo(
    () => itemsToMap(selectedPackages.flatMap((pkg) => pkg.items || [])),
    [selectedPackages]
  );
  const reservedPackageQty = useMemo(
    () => itemsToMap(selectedPackages.filter((pkg) => pkg.status === 'ready').flatMap((pkg) => pkg.items || [])),
    [selectedPackages]
  );
  const deliveryItems = combineItemLists(selectedPackages.flatMap((pkg) => pkg.items || []), mapToItems(manualQty));
  const qty = itemsToMap(deliveryItems);
  const original = delivery ? itemsToMap(delivery.items) : {};
  const limits = {};
  for (const entry of model.catalog) {
    const stock = model.stock[entry.serial];
    limits[entry.serial] =
      (stock?.available || 0) +
      (original[entry.serial] || 0);
  }
  const units = mapTotal(qty);
  const stockPreview = model.catalog
    .map((entry) => {
      const packageUnits = packageQty[entry.serial] || 0;
      const manualUnits = Number(manualQty[entry.serial]) || 0;
      const requested = packageUnits + manualUnits;
      const available = (model.stock[entry.serial]?.available || 0) + (reservedPackageQty[entry.serial] || 0) + (original[entry.serial] || 0);
      return { serial: entry.serial, packageUnits, manualUnits, requested, available, remaining: available - requested };
    })
    .filter((item) => item.requested > 0);
  const stockIssues = stockPreview.filter((item) => item.remaining < 0);
  const price = priceDelivery(data.priceTiers, units, manual);
  const paymentModel = delivery?.payment_model || store?.payment_model || 'consignment';
  const manualEntries = model.catalog.filter((entry) =>
    !entry.product?.not_for_sale || Number(manualQty[entry.serial]) > 0
  );

  const togglePackage = (packageId) => {
    setSelectedPackageIds((current) => current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : [...current, packageId]);
  };

  const submit = async () => {
    const crossTownPackages = selectedPackages.filter((pkg) =>
      store && String(pkg.town || '').trim().toLocaleLowerCase() !== String(store.town || '').trim().toLocaleLowerCase()
    );
    if (crossTownPackages.length && !window.confirm(t(
      `החבילות ${crossTownPackages.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')} מיועדות לעיר אחרת מזו של החנות (${store.town}). להמשיך בכל זאת?`,
      `Packages ${crossTownPackages.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')} are assigned to a different town than this store (${store.town}). Deliver anyway?`
    ))) return;

    const paused = mapToItems(manualQty).filter((item) => model.entryBySerial[item.serial_number]?.product?.distribution_paused);
    if (paused.length && !window.confirm(t(
      `המספרים ${paused.map((item) => item.serial_number).join(', ')} מושהים להפצה. לעקוף את האזהרה ולהמשיך?`,
      `Numbers ${paused.map((item) => item.serial_number).join(', ')} are paused for distribution. Override and continue?`
    ))) return;

    setSaving(true);
    setFail(null);
    const values = {
      store_id: storeId,
      delivery_date: date,
      payment_model: paymentModel,
      items: deliveryItems,
      manual_items: mapToItems(manualQty),
      package_ids: selectedPackageIds,
      package_id: selectedPackageIds.length === 1 ? selectedPackageIds[0] : undefined,
      total_units: units,
      unit_price: price.unit_price,
      price_source: price.source,
      tier_batch_size: price.tier?.batch_size,
      total_value: price.total_value,
      reference,
    };
    const result = selectedPackageIds.length && !delivery?.id
      ? await issuePackages(selectedPackageIds, values)
      : await save('deliveries', values, delivery?.id);
    setSaving(false);
    if (result.ok) onClose();
    else setFail(result);
  };

  return (
    <FormDialog
      wide
      title={delivery ? t('עריכת אספקה', 'Edit delivery') : t('אספקה חדשה', 'New delivery')}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      canSubmit={!!storeId && (selectedPackageIds.length > 0 || units > 0) && stockIssues.length === 0}
      error={fail && <ViolationAlert result={fail} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('חנות', 'Store')}><StoreCombobox stores={data.stores} value={storeId} onChange={setStoreId} /></Field>
        <Field label={t('תאריך', 'Date')}><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label={t('תעודת משלוח', 'Delivery note')}><Input value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
      </div>
      {storeId && <ModelBadge model={paymentModel} />}
      {!delivery?.id && (
        <Field label={t('חבילות מוכנות (אפשר לבחור כמה)', 'Ready packages (select multiple)')}>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3">
            {packageOptions.map((pkg) => (
              <label key={pkg.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5">
                <Checkbox checked={selectedPackageIds.includes(pkg.id)} onCheckedChange={() => togglePackage(pkg.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t('חבילה', 'Package')} #{pkg.package_number} · {pkg.town}</span>
                  <span className="block text-xs text-muted-foreground">{pkg.total_units} {t('יחידות', 'units')} · {pkg.items?.length || 0} {t('סוגים', 'variations')}</span>
                </span>
              </label>
            ))}
            {!packageOptions.length && <p className="text-sm text-muted-foreground">{t('אין חבילות מוכנות. אפשר לבחור פריטים ידנית למטה.', 'No ready packages. You can choose items manually below.')}</p>}
          </div>
        </Field>
      )}
      {!!selectedPackages.length && (
        <Field label={t('תכולת החבילות שנבחרו', 'Selected package contents')}>
          <div className="flex flex-wrap gap-2 rounded-xl border p-3">
            {selectedPackages.map((pkg) => (
              <span key={pkg.id} className="flex items-center gap-1 rounded-full border pe-2">
                #{pkg.package_number} · {pkg.town}:
                {(pkg.items || []).map((item) => <span key={item.serial_number} className="ms-1 flex items-center gap-1"><SerialBadge serial={item.serial_number} size="sm" />×{item.quantity}</span>)}
              </span>
            ))}
          </div>
        </Field>
      )}
      <Field label={t('פריטים נוספים בכמויות ידניות', 'Additional items and quantities')}>
        <QtyGrid entries={manualEntries} value={manualQty} onChange={setManualQty} limits={limits} />
      </Field>
      <Field label={t('בדיקת מלאי לפני אספקה', 'Stock preview before delivery')}>
        {stockPreview.length ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-start text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-start">{t('מספר', 'Item')}</th>
                  <th className="p-2 text-end">{t('מחבילות', 'Packages')}</th>
                  <th className="p-2 text-end">{t('ידני', 'Manual')}</th>
                  <th className="p-2 text-end">{t('זמין לאספקה', 'Available')}</th>
                  <th className="p-2 text-end">{t('יישאר', 'Remaining')}</th>
                </tr>
              </thead>
              <tbody>
                {stockPreview.map((item) => (
                  <tr key={item.serial} className={item.remaining < 0 ? 'text-destructive' : ''}>
                    <td className="p-2"><SerialBadge serial={item.serial} size="sm" /></td>
                    <td className="p-2 text-end">{item.packageUnits}</td>
                    <td className="p-2 text-end">{item.manualUnits}</td>
                    <td className="p-2 text-end">{item.available}</td>
                    <td className="p-2 text-end">{item.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stockIssues.length > 0 && (
              <p className="border-t p-2 text-sm text-destructive">
                {t('אין מספיק מלאי עבור המספרים', 'Insufficient stock for items')} {stockIssues.map((item) => item.serial).join(', ')}.
              </p>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground">{t('בחרי חבילות או כמויות כדי לראות את המלאי הצפוי.', 'Select packages or quantities to preview stock.')}</p>}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('מחיר אחיד ליחידה באספקה (ריק = לפי מדרגות)', 'One unit price for this supply (blank = tier pricing)')}>
          <Input type="number" dir="ltr" value={manual} onChange={(event) => setManual(event.target.value)} />
        </Field>
        <Field label={t('סיכום האספקה', 'Supply summary')}>
          <p className="pt-2 text-sm">{units} {t('יחידות', 'units')} · {money(price.unit_price)} {t('ליחידה', 'per unit')} · <b>{money(price.total_value)}</b></p>
        </Field>
      </div>
    </FormDialog>
  );
}
