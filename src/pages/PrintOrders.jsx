import React, { useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import PrintOrderForm from '@/components/print/PrintOrderForm';

export default function PrintOrders() {
  const { t, num, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const del = useDeleteFlow({ run: (id) => remove('printOrders', id), title: () => t('למחוק הזמנת הדפסה?', 'Delete this print order?') });
  if (!model) return <LoadingBlock />;

  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (o) => o.order_date, firstSort: 'desc', cell: (o) => date(o.order_date) },
    { key: 'provider', header: t('בית דפוס', 'Print house'), cell: (o) => o.provider },
    { key: 'copies', header: t('עותקים', 'Copies'), sort: (o) => o.total_copies, cell: (o) => num(o.total_copies) },
    { key: 'price', header: t('מחיר', 'Price'), sort: (o) => o.total_price, cell: (o) => money(o.total_price) },
    { key: 'actions', header: '', align: 'end', cell: (o) => <RowActions onEdit={() => setForm(o)} onDelete={() => del.ask(o)} /> },
  ];

  return (
    <>
      <PageHeader title={t('הזמנות הדפסה', 'Print orders')} actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('הזמנה חדשה', 'New order')}</Button>} />
      <DataTable
        columns={columns} rows={data.printOrders}
        empty={<EmptyState icon={Printer} title={t('אין הזמנות הדפסה', 'No print orders')} text={t('רשמו הדפסה כדי שהמלאי יתעדכן.', 'Record a print run to build your stock.')} />}
      />
      {form && <PrintOrderForm order={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}