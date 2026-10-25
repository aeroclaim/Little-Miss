import React, { useMemo } from 'react';
import { ClipboardList, Layers, Package, Hash } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { analyzeDemand } from '@/lib/logic/analytics';
import StatCard from '@/components/shared/StatCard';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import SerialBadge from '@/components/shared/SerialBadge';

// Open preorders only: where the demand is, and which numbers we do not have enough of.
export default function DemandAnalysis() {
  const { t, num } = useLang();
  const { data, model } = useAppData();
  const demand = useMemo(
    () => analyzeDemand({ preorders: data.preorders, storeById: model.storeById, stock: model.stock }),
    [data.preorders, model]
  );
  const { totals } = demand;
  if (!totals.orders) {
    return <EmptyState icon={ClipboardList} title={t('אין ביקוש פתוח', 'No open demand')} text={t('הזמנות מראש פתוחות יופיעו כאן.', 'Open preorders will show up here.')} />;
  }

  const townCols = [
    { key: 'town', header: t('עיר', 'Town'), sort: (r) => r.town, cell: (r) => <span className="font-medium">{r.town}</span> },
    { key: 'orders', header: t('הזמנות', 'Orders'), sort: (r) => r.orders, cell: (r) => num(r.orders) },
    { key: 'general', header: t('כלליות', 'General'), sort: (r) => r.general, cell: (r) => num(r.general) },
    { key: 'specific', header: t('ספציפיות', 'Specific'), sort: (r) => r.specific, cell: (r) => num(r.specific) },
    { key: 'units', header: t('סה״כ', 'Total'), sort: (r) => r.units, firstSort: 'desc', cell: (r) => <b>{num(r.units)}</b> },
  ];
  const serialCols = [
    { key: 'serial', header: t('מספר', 'No.'), sort: (r) => r.serial, cell: (r) => <SerialBadge serial={r.serial} /> },
    { key: 'units', header: t('מבוקש', 'Requested'), sort: (r) => r.units, firstSort: 'desc', cell: (r) => num(r.units) },
    { key: 'available', header: t('מלאי פנוי', 'Free stock'), sort: (r) => r.available, cell: (r) => num(r.available) },
    {
      key: 'gap', header: t('חסר', 'Short'), sort: (r) => r.gap, firstSort: 'desc',
      cell: (r) => (r.gap ? <span className="font-semibold text-destructive">{num(r.gap)}</span> : '—'),
    },
    { key: 'topTown', header: t('עיר מובילה', 'Top town'), cell: (r) => r.topTown || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('הזמנות פתוחות', 'Open orders')} value={num(totals.orders)} icon={ClipboardList} />
        <StatCard label={t('סה״כ יחידות', 'Total units')} value={num(totals.units)} icon={Package} tone="rose" />
        <StatCard label={t('כלליות', 'General')} value={num(totals.general)} icon={Layers} tone="mint" />
        <StatCard label={t('ספציפיות', 'Specific')} value={num(totals.specific)} icon={Hash} tone="amber" />
      </div>
      <Section title={t('ביקוש לפי עיר', 'Demand by town')} bodyClassName="p-0">
        <DataTable columns={townCols} rows={demand.byTown} initialSort={{ key: 'units', dir: 'desc' }} className="border-0 shadow-none" />
      </Section>
      {demand.bySerial.length > 0 && (
        <Section title={t('ביקוש לפי מספר', 'Demand by number')} description={t('מול המלאי הפנוי במחסן', 'Against the free stock in the warehouse')} bodyClassName="p-0">
          <DataTable columns={serialCols} rows={demand.bySerial} initialSort={{ key: 'gap', dir: 'desc' }} className="border-0 shadow-none" />
        </Section>
      )}
    </div>
  );
}