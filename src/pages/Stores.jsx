import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import ModelBadge from '@/components/shared/ModelBadge';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import StoreForm from '@/components/stores/StoreForm';

export default function Stores() {
  const { t, num, money } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const del = useDeleteFlow({ run: (id) => remove('stores', id), title: (s) => t(`למחוק את "${s.name}"?`, `Delete "${s.name}"?`) });
  if (!model) return <LoadingBlock />;

  const columns = [
    { key: 'name', header: t('חנות', 'Store'), sort: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}{s.is_active === false && <span className="ms-2 text-xs text-muted-foreground">({t('לא פעילה', 'inactive')})</span>}</span> },
    { key: 'town', header: t('עיר', 'Town'), sort: (s) => s.town, cell: (s) => s.town },
    { key: 'model', header: t('מודל', 'Model'), cell: (s) => <ModelBadge model={s.payment_model} /> },
    { key: 'shelf', header: t('בחנות', 'On shelf'), sort: (s) => model.storeStats[s.id]?.inStore || 0, cell: (s) => num(model.storeStats[s.id]?.inStore || 0) },
    { key: 'balance', header: t('יתרת חוב', 'Balance'), sort: (s) => model.finance[s.id]?.balance || 0, cell: (s) => money(model.finance[s.id]?.balance || 0) },
    { key: 'actions', header: '', align: 'end', cell: (s) => <RowActions onEdit={() => setForm(s)} onDelete={() => del.ask(s)} /> },
  ];

  return (
    <>
      <PageHeader title={t('חנויות', 'Stores')} actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('חנות חדשה', 'New store')}</Button>} />
      <DataTable
        columns={columns} rows={data.stores} onRowClick={(s) => navigate(`/stores/${s.id}`)}
        empty={<EmptyState icon={Store} title={t('אין חנויות עדיין', 'No stores yet')} text={t('הוסיפו חנות כדי להתחיל לספק.', 'Add a store to start delivering.')} />}
      />
      {form && <StoreForm store={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}