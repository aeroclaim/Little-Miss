import React from 'react';
import { Boxes, Package, Receipt, Store, Wallet } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import LoadingBlock from '@/components/shared/LoadingBlock';
import SerialBadge from '@/components/shared/SerialBadge';
import LevelBadge from '@/components/shared/LevelBadge';

export default function Dashboard() {
  const { t, num, money } = useLang();
  const { model } = useAppData();
  if (!model) return <LoadingBlock />;
  const tot = model.totals;
  const levels = Object.fromEntries(model.rarity.overall.rows.map((r) => [r.serial, r.level]));
  const rows = model.printedSerials.map((serial) => ({ id: serial, serial, ...model.stock[serial], level: levels[serial] }));

  const columns = [
    { key: 'serial', header: t('מספר', 'No.'), sort: (r) => r.serial, cell: (r) => <SerialBadge serial={r.serial} /> },
    { key: 'printed', header: t('הודפס', 'Printed'), sort: (r) => r.printed, cell: (r) => num(r.printed) },
    { key: 'available', header: t('מלאי פנוי', 'In stock'), sort: (r) => r.available, cell: (r) => num(r.available) },
    { key: 'inStores', header: t('בחנויות', 'In stores'), sort: (r) => r.inStores, cell: (r) => num(r.inStores) },
    { key: 'level', header: t('נדירות', 'Rarity'), cell: (r) => <LevelBadge level={r.level} /> },
  ];

  return (
    <>
      <PageHeader title={t('לוח בקרה', 'Dashboard')} subtitle={t('מצב ההפצה של אוסף ליטל מיס', 'Distribution status of the Little Miss collection')} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t('הודפסו', 'Printed')} value={num(tot.printed)} icon={Package} />
        <StatCard label={t('מלאי פנוי', 'Free stock')} value={num(tot.available)} icon={Boxes} tone="mint" />
        <StatCard label={t('בחנויות', 'In stores')} value={num(tot.delivered - tot.returned)} icon={Store} tone="rose" />
        <StatCard label={t('חוב חנויות', 'Owed by stores')} value={money(tot.receivable, 0)} icon={Wallet} tone="amber" />
        <StatCard label={t('הוצאות רשומות', 'Recorded expenses')} value={money(tot.totalExpenses, 0)} icon={Receipt} tone="rose" />
        <StatCard label={t('חיובים פחות הוצאות', 'Charges less expenses')} value={money(tot.afterTrackedExpenses, 0)} icon={Wallet} />
      </div>
      <p className="-mt-3 mb-5 text-xs text-muted-foreground">{t('הסכום כולל רק חיובים ורווחי מכירה רשומים פחות הוצאות הדפסה והוצאות ידניות; אינו כולל עלויות שלא נרשמו.', 'This is recorded charges and sales less print and manual expenses; unrecorded costs are not included.')}</p>
      <Section title={t('מלאי לפי מספר', 'Stock by number')} bodyClassName="p-0">
        <DataTable columns={columns} rows={rows} className="border-0 shadow-none" empty={<p className="p-8 text-center text-sm text-muted-foreground">{t('עדיין לא הודפס מלאי.', 'Nothing printed yet.')}</p>} />
      </Section>
    </>
  );
}