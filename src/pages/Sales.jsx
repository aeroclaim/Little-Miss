import React, { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { matchesStore } from '@/lib/logic/format';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import SearchInput from '@/components/shared/SearchInput';
import StoreName from '@/components/shared/StoreName';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import SaleForm from '@/components/sales/SaleForm';

export default function Sales() {
  const { t, num, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const del = useDeleteFlow({ run: (id) => remove('sales', id), title: () => t('למחוק דיווח מכירה?', 'Delete this sales report?') });
  if (!model) return <LoadingBlock />;

  const rows = data.sales.filter((s) => matchesStore(model.storeById[s.store_id], query));
  const totals = {
    date: t('סה״כ', 'Total'),
    units: num(rows.reduce((sum, s) => sum + (s.total_units || 0), 0)),
    value: money(rows.reduce((sum, s) => sum + (s.total_value || 0), 0)),
  };
  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (s) => s.sale_date, firstSort: 'desc', cell: (s) => date(s.sale_date) },
    { key: 'store', header: t('חנות', 'Store'), sort: (s) => model.storeById[s.store_id]?.name || '', cell: (s) => <StoreName store={model.storeById[s.store_id]} /> },
    { key: 'units', header: t('יחידות', 'Units'), sort: (s) => s.total_units, cell: (s) => num(s.total_units) },
    { key: 'price', header: t('מחיר ליחידה', 'Unit price'), cell: (s) => money(s.unit_price) },
    { key: 'value', header: t('סכום לתשלום', 'Amount due'), sort: (s) => s.total_value, cell: (s) => money(s.total_value) },
    { key: 'actions', header: '', align: 'end', cell: (s) => <RowActions onEdit={() => setForm(s)} onDelete={() => del.ask(s)} /> },
  ];

  return (
    <>
      <PageHeader
        title={t('דיווחי מכירות', 'Sales reports')}
        subtitle={t('מה החנויות דיווחו שנמכר. בחנות בתשלום לפי מכירה כל מכירה יוצרת חוב לתשלום.', 'What stores reported as sold. For consignment stores every sale creates an amount due.')}
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('דיווח חדש', 'New report')}</Button>}
      />
      <SearchInput className="mb-4 max-w-sm" value={query} onChange={setQuery} placeholder={t('חיפוש חנות או עיר...', 'Search store or town...')} />
      <DataTable
        columns={columns} rows={rows} totals={totals} initialSort={{ key: 'date', dir: 'desc' }}
        empty={
          <EmptyState
            icon={ShoppingBag}
            title={query ? t('לא נמצאו תוצאות', 'No results') : t('אין דיווחי מכירות', 'No sales reports')}
            text={query ? undefined : t('רשמו מה חנות דיווחה שנמכר כדי לעדכן את המדף והחוב שלה.', 'Record what a store reported as sold to update its shelf and balance.')}
          />
        }
      />
      {form && <SaleForm sale={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}