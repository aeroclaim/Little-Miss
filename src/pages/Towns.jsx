import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { formatPercent } from '@/lib/logic/format';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RateBar from '@/components/shared/RateBar';
import TownDetailDialog from '@/components/towns/TownDetailDialog';

export default function Towns() {
  const { t, num, money } = useLang();
  const { model } = useAppData();
  const [selected, setSelected] = useState(null);
  if (!model) return <LoadingBlock />;

  const sum = (key) => model.towns.reduce((total, r) => total + r[key], 0);
  const totals = {
    town: t('סה״כ', 'Total'),
    stores: num(sum('storeCount')),
    delivered: num(sum('delivered')),
    sold: num(sum('sold')),
    inStore: num(sum('inStore')),
    balance: money(sum('balance')),
  };
  const columns = [
    { key: 'town', header: t('עיר', 'Town'), sort: (r) => r.town, cell: (r) => <span className="font-medium">{r.town}</span> },
    { key: 'stores', header: t('חנויות', 'Stores'), sort: (r) => r.storeCount, cell: (r) => num(r.storeCount) },
    { key: 'delivered', header: t('סופקו', 'Delivered'), sort: (r) => r.delivered, cell: (r) => num(r.delivered) },
    { key: 'sold', header: t('נמכרו', 'Sold'), sort: (r) => r.sold, cell: (r) => num(r.sold) },
    { key: 'inStore', header: t('על המדף', 'On shelf'), sort: (r) => r.inStore, cell: (r) => num(r.inStore) },
    { key: 'returned', header: t('החזרות', 'Returns'), sort: (r) => r.returnRate, cell: (r) => `${num(r.returned)} (${formatPercent(r.returnRate)})` },
    { key: 'coverage', header: t('כיסוי מספרים', 'Number coverage'), sort: (r) => r.coverage, cell: (r) => <RateBar value={r.coverage} label={formatPercent(r.coverage)} tone="mint" /> },
    { key: 'balance', header: t('יתרת חוב', 'Balance'), sort: (r) => r.balance, cell: (r) => money(r.balance) },
  ];

  return (
    <>
      <PageHeader
        title={t('ערים', 'Towns')}
        subtitle={t('סיכום הפצה לפי עיר. לחצו על עיר כדי לראות אילו מספרים חסרים או נדירים בה.', 'Distribution summary by town. Click a town to see which numbers are missing or rare there.')}
      />
      <DataTable
        columns={columns} rows={model.towns} totals={totals} onRowClick={setSelected} initialSort={{ key: 'delivered', dir: 'desc' }}
        empty={<EmptyState icon={MapPin} title={t('אין חנויות עדיין', 'No stores yet')} text={t('הוסיפו חנויות כדי לראות סיכום לפי עיר.', 'Add stores to see a summary by town.')} />}
      />
      {selected && <TownDetailDialog town={selected} onClose={() => setSelected(null)} />}
    </>
  );
}