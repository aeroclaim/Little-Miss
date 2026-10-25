import React, { useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import ReturnForm from '@/components/returns/ReturnForm';
import ReturnsAnalysis from '@/components/returns/ReturnsAnalysis';

export default function Returns() {
  const { t, dir, num, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const del = useDeleteFlow({ run: (id) => remove('returns', id), title: () => t('למחוק החזרה?', 'Delete this return?') });
  if (!model) return <LoadingBlock />;

  const rows = data.returns.filter((r) => matchesStore(model.storeById[r.store_id], query));
  const totals = {
    date: t('סה״כ', 'Total'),
    units: num(rows.reduce((sum, r) => sum + (r.total_units || 0), 0)),
    faulty: num(rows.reduce((sum, r) => sum + (r.faulty_units || 0), 0)),
    credit: money(rows.reduce((sum, r) => sum + (r.credit_value || 0), 0)),
  };
  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (r) => r.return_date, firstSort: 'desc', cell: (r) => date(r.return_date) },
    { key: 'store', header: t('חנות', 'Store'), sort: (r) => model.storeById[r.store_id]?.name || '', cell: (r) => <StoreName store={model.storeById[r.store_id]} /> },
    { key: 'units', header: t('יחידות', 'Units'), sort: (r) => r.total_units, cell: (r) => num(r.total_units) },
    { key: 'faulty', header: t('תקולים', 'Faulty'), sort: (r) => r.faulty_units || 0, cell: (r) => (r.faulty_units ? <span className="font-medium text-rose-700">{num(r.faulty_units)}</span> : '—') },
    { key: 'credit', header: t('זיכוי', 'Credit'), sort: (r) => r.credit_value || 0, cell: (r) => (r.credit_value ? money(r.credit_value) : '—') },
    { key: 'reason', header: t('סיבה', 'Reason'), cell: (r) => r.reason || '—' },
    { key: 'actions', header: '', align: 'end', cell: (r) => <RowActions onEdit={() => setForm(r)} onDelete={() => del.ask(r)} /> },
  ];

  return (
    <>
      <PageHeader
        title={t('החזרות', 'Returns')}
        subtitle={t('מלאי שחוזר מחנויות חוזר למלאי הפנוי, חוץ מפריטים תקולים.', 'Returned stock goes back to free stock, except faulty items.')}
        actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('החזרה חדשה', 'New return')}</Button>}
      />
      <Tabs defaultValue="list" dir={dir}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">{t('החזרות', 'Returns')}</TabsTrigger>
          <TabsTrigger value="analysis">{t('ניתוח', 'Analysis')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <SearchInput className="mb-4 max-w-sm" value={query} onChange={setQuery} placeholder={t('חיפוש חנות או עיר...', 'Search store or town...')} />
          <DataTable
            columns={columns} rows={rows} totals={totals} initialSort={{ key: 'date', dir: 'desc' }}
            empty={
              <EmptyState
                icon={Undo2}
                title={query ? t('לא נמצאו תוצאות', 'No results') : t('אין החזרות', 'No returns')}
                text={query ? undefined : t('רשמו החזרה כדי להחזיר מלאי למחסן.', 'Record a return to bring stock back to the warehouse.')}
              />
            }
          />
        </TabsContent>
        <TabsContent value="analysis"><ReturnsAnalysis /></TabsContent>
      </Tabs>
      {form && <ReturnForm ret={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}