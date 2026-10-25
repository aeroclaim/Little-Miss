import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import ModelBadge from '@/components/shared/ModelBadge';
import StoreName from '@/components/shared/StoreName';

// What every store owes right now. Clicking a row opens the store's full account.
export default function BalancesTable({ onPay }) {
  const { t, money, date } = useLang();
  const { data, model } = useAppData();
  const navigate = useNavigate();
  const rows = data.stores
    .map((s) => ({ id: s.id, store: s, ...model.finance[s.id] }))
    .filter((r) => r.charges > 0 || r.credits > 0 || r.paid > 0);

  const columns = [
    { key: 'store', header: t('חנות', 'Store'), sort: (r) => r.store.name, cell: (r) => <StoreName store={r.store} /> },
    { key: 'model', header: t('מודל', 'Model'), cell: (r) => <ModelBadge model={r.store.payment_model} /> },
    { key: 'charges', header: t('חויב', 'Charged'), sort: (r) => r.charges, cell: (r) => money(r.charges) },
    { key: 'credits', header: t('זיכויים', 'Credits'), sort: (r) => r.credits, cell: (r) => (r.credits ? money(r.credits) : '—') },
    { key: 'paid', header: t('שולם', 'Paid'), sort: (r) => r.paid, cell: (r) => money(r.paid) },
    {
      key: 'balance', header: t('יתרה', 'Balance'), sort: (r) => r.balance, firstSort: 'desc',
      cell: (r) => <span className={cn('font-semibold tabular-nums', r.balance > 0 ? 'text-amber-700' : 'text-emerald-700')}>{money(r.balance)}</span>,
    },
    { key: 'last', header: t('תשלום אחרון', 'Last payment'), sort: (r) => r.lastPayment || '', cell: (r) => date(r.lastPayment) },
    {
      key: 'actions', header: '', align: 'end',
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onPay(r.id); }}>
          {t('רישום תשלום', 'Record payment')}
        </Button>
      ),
    },
  ];

  return (
    <Section title={t('יתרות לפי חנות', 'Balances by store')} description={t('לחצו על חנות לפירוט מלא', 'Click a store for the full history')} bodyClassName="p-0">
      <DataTable
        columns={columns} rows={rows} initialSort={{ key: 'balance', dir: 'desc' }}
        onRowClick={(r) => navigate(`/stores/${r.id}`)} className="border-0 shadow-none"
        empty={<EmptyState icon={Wallet} title={t('אין יתרות עדיין', 'No balances yet')} text={t('יתרות יופיעו אחרי אספקה לחנות בחשבונית או דיווח מכירה.', 'Balances appear after an invoiced delivery or a sales report.')} />}
      />
    </Section>
  );
}