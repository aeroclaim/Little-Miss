import React, { useMemo } from 'react';
import { Undo2 } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { analyzeReturns } from '@/lib/logic/analytics';
import { formatPercent } from '@/lib/logic/format';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import RateBar from '@/components/shared/RateBar';
import SerialBadge from '@/components/shared/SerialBadge';
import StoreName from '@/components/shared/StoreName';

export default function ReturnsAnalysis() {
  const { t, num, date } = useLang();
  const { data, model } = useAppData();
  const { byStore, bySerial } = useMemo(
    () => analyzeReturns({ stores: data.stores, storeStats: model.storeStats, stock: model.stock, serials: model.catalog.map((c) => c.serial) }),
    [data.stores, model]
  );
  if (!byStore.length) {
    return <EmptyState icon={Undo2} title={t('אין נתוני החזרות', 'No return data')} text={t('הניתוח יופיע אחרי שיהיו אספקות והחזרות.', 'The analysis appears once there are deliveries and returns.')} />;
  }
  const maxStore = Math.max(0, ...byStore.map((r) => r.rate)) || 1;
  const maxSerial = Math.max(0, ...bySerial.map((r) => r.rate)) || 1;

  const storeCols = [
    { key: 'store', header: t('חנות', 'Store'), sort: (r) => r.store.name, cell: (r) => <StoreName store={r.store} /> },
    { key: 'delivered', header: t('סופקו', 'Delivered'), sort: (r) => r.delivered, cell: (r) => num(r.delivered) },
    { key: 'returned', header: t('הוחזרו', 'Returned'), sort: (r) => r.returned, cell: (r) => num(r.returned) },
    { key: 'rate', header: t('שיעור החזרה', 'Return rate'), sort: (r) => r.rate, firstSort: 'desc', cell: (r) => <RateBar value={r.rate} max={maxStore} label={formatPercent(r.rate)} /> },
    { key: 'faulty', header: t('תקולים', 'Faulty'), sort: (r) => r.faulty, cell: (r) => num(r.faulty) },
    { key: 'frequency', header: t('החזרות / אספקות', 'Returns / deliveries'), sort: (r) => r.frequency, cell: (r) => `${r.returnCount} / ${r.deliveryCount}` },
    { key: 'last', header: t('החזרה אחרונה', 'Last return'), sort: (r) => r.lastReturn || '', cell: (r) => date(r.lastReturn) },
  ];
  const serialCols = [
    { key: 'serial', header: t('מספר', 'No.'), sort: (r) => r.serial, cell: (r) => <SerialBadge serial={r.serial} /> },
    { key: 'delivered', header: t('סופקו', 'Delivered'), sort: (r) => r.delivered, cell: (r) => num(r.delivered) },
    { key: 'returned', header: t('הוחזרו', 'Returned'), sort: (r) => r.returned, cell: (r) => num(r.returned) },
    { key: 'rate', header: t('שיעור החזרה', 'Return rate'), sort: (r) => r.rate, firstSort: 'desc', cell: (r) => <RateBar value={r.rate} max={maxSerial} label={formatPercent(r.rate)} /> },
    { key: 'faulty', header: t('תקולים', 'Faulty'), sort: (r) => r.faulty, cell: (r) => num(r.faulty) },
    { key: 'stores', header: t('חנויות שמחזירות', 'Stores returning'), sort: (r) => r.storesReturning, cell: (r) => num(r.storesReturning) },
  ];

  return (
    <div className="space-y-6">
      <Section title={t('תדירות החזרות לפי חנות', 'Return frequency by store')} bodyClassName="p-0">
        <DataTable columns={storeCols} rows={byStore} initialSort={{ key: 'rate', dir: 'desc' }} className="border-0 shadow-none" />
      </Section>
      <Section title={t('המספרים שחוזרים הכי הרבה', 'Numbers returned the most')} bodyClassName="p-0">
        <DataTable columns={serialCols} rows={bySerial} initialSort={{ key: 'rate', dir: 'desc' }} className="border-0 shadow-none" />
      </Section>
    </div>
  );
}