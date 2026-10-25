import React, { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import StoreName from '@/components/shared/StoreName';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import PreorderForm from '@/components/preorders/PreorderForm';
import DemandAnalysis from '@/components/preorders/DemandAnalysis';
import StatusBadge from '@/components/preorders/StatusBadge';
import NumberChips from '@/components/preorders/NumberChips';

export default function Preorders() {
  const { t, dir, num, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const del = useDeleteFlow({ run: (id) => remove('preorders', id), title: () => t('למחוק הזמנה מראש?', 'Delete this preorder?') });
  if (!model) return <LoadingBlock />;

  const whoName = (p) => model.storeById[p.store_id]?.name || p.town || '';
  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (p) => p.preorder_date, firstSort: 'desc', cell: (p) => date(p.preorder_date) },
    {
      key: 'who', header: t('מי הזמין', 'Ordered by'), sort: whoName,
      cell: (p) => (model.storeById[p.store_id] ? <StoreName store={model.storeById[p.store_id]} /> : <span>{p.town || '—'}</span>),
    },
    { key: 'numbers', header: t('מספרים', 'Numbers'), cell: (p) => <NumberChips items={p.items} /> },
    { key: 'general', header: t('כללי', 'General'), sort: (p) => p.general_quantity || 0, cell: (p) => num(p.general_quantity || 0) },
    { key: 'total', header: t('סה״כ', 'Total'), sort: (p) => p.total_units, cell: (p) => <b>{num(p.total_units)}</b> },
    { key: 'status', header: t('סטטוס', 'Status'), sort: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
    { key: 'actions', header: '', align: 'end', cell: (p) => <RowActions onEdit={() => setForm(p)} onDelete={() => del.ask(p)} /> },
  ];

  return (
    <>
      <PageHeader
        title={t('הזמנות מראש', 'Preorders')}
        subtitle={t('ביקוש שטרם סופק, לפי עיר ולפי מספר.', 'Demand not yet delivered, by town and by number.')}
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('הזמנה חדשה', 'New preorder')}</Button>}
      />
      <Tabs defaultValue="orders" dir={dir}>
        <TabsList className="mb-4">
          <TabsTrigger value="orders">{t('הזמנות', 'Orders')}</TabsTrigger>
          <TabsTrigger value="demand">{t('ניתוח ביקוש', 'Demand')}</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <DataTable
            columns={columns} rows={data.preorders} initialSort={{ key: 'date', dir: 'desc' }}
            empty={<EmptyState icon={ClipboardList} title={t('אין הזמנות מראש', 'No preorders')} text={t('רשמו הזמנה מראש כדי לראות את הביקוש לפי עיר ומספר.', 'Record a preorder to see demand by town and number.')} />}
          />
        </TabsContent>
        <TabsContent value="demand"><DemandAnalysis /></TabsContent>
      </Tabs>
      {form && <PreorderForm preorder={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}