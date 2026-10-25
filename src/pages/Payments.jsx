import React, { useState } from 'react';
import { Banknote, Plus, Receipt, Undo2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { matchesStore } from '@/lib/logic/format';
import { PAYMENT_METHODS, optionLabel } from '@/lib/logic/options';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import SearchInput from '@/components/shared/SearchInput';
import StoreName from '@/components/shared/StoreName';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import PaymentForm from '@/components/payments/PaymentForm';
import BalancesTable from '@/components/payments/BalancesTable';

export default function Payments() {
  const { t, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const del = useDeleteFlow({ run: (id) => remove('payments', id), title: () => t('למחוק תשלום?', 'Delete this payment?') });
  if (!model) return <LoadingBlock />;

  const tot = model.totals;
  const rows = data.payments.filter((p) => matchesStore(model.storeById[p.store_id], query));
  const totals = { date: t('סה״כ', 'Total'), amount: money(rows.reduce((sum, p) => sum + (p.amount || 0), 0)) };
  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (p) => p.payment_date, firstSort: 'desc', cell: (p) => date(p.payment_date) },
    { key: 'store', header: t('חנות', 'Store'), sort: (p) => model.storeById[p.store_id]?.name || '', cell: (p) => <StoreName store={model.storeById[p.store_id]} /> },
    { key: 'amount', header: t('סכום', 'Amount'), sort: (p) => p.amount, cell: (p) => <b>{money(p.amount)}</b> },
    { key: 'method', header: t('אמצעי', 'Method'), cell: (p) => optionLabel(PAYMENT_METHODS, p.method, t) },
    { key: 'reference', header: t('אסמכתא', 'Reference'), cell: (p) => p.reference || '—' },
    { key: 'actions', header: '', align: 'end', cell: (p) => <RowActions onEdit={() => setForm(p)} onDelete={() => del.ask(p)} /> },
  ];

  return (
    <>
      <PageHeader
        title={t('תשלומים', 'Payments')}
        subtitle={t('מה החנויות חייבות ומה כבר שילמו, עד התשלום הסופי.', 'What stores owe and what they have already paid, through to the final payment.')}
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('תשלום חדש', 'New payment')}</Button>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('חויב', 'Charged')} value={money(tot.charged, 0)} icon={Receipt} />
        <StatCard label={t('זיכויים', 'Credits')} value={money(tot.credits, 0)} icon={Undo2} tone="rose" />
        <StatCard label={t('התקבל', 'Received')} value={money(tot.paid, 0)} icon={Banknote} tone="mint" />
        <StatCard label={t('נותר לגבות', 'Left to collect')} value={money(tot.receivable, 0)} icon={Wallet} tone="amber" />
      </div>
      <BalancesTable onPay={(storeId) => setForm({ defaultStoreId: storeId })} />
      <Section
        className="mt-6" bodyClassName="p-0" title={t('תשלומים שהתקבלו', 'Payments received')}
        actions={<SearchInput className="w-64" value={query} onChange={setQuery} placeholder={t('חיפוש חנות או עיר...', 'Search store or town...')} />}
      >
        <DataTable
          columns={columns} rows={rows} totals={totals} initialSort={{ key: 'date', dir: 'desc' }} className="border-0 shadow-none"
          empty={<EmptyState icon={Banknote} title={query ? t('לא נמצאו תוצאות', 'No results') : t('אין תשלומים', 'No payments')} text={query ? undefined : t('רשמו תשלום שהתקבל מחנות.', 'Record a payment received from a store.')} />}
        />
      </Section>
      {form && <PaymentForm payment={form.id ? form : null} defaultStoreId={form.defaultStoreId} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}