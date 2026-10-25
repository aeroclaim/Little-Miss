import React, { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
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
import DeliveryForm from '@/components/deliveries/DeliveryForm';
import PriceTiers from '@/components/deliveries/PriceTiers';

export default function Deliveries() {
  const { t, num, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const del = useDeleteFlow({ run: (id) => remove('deliveries', id), title: () => t('למחוק אספקה?', 'Delete this delivery?') });
  if (!model) return <LoadingBlock />;

  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (d) => d.delivery_date, firstSort: 'desc', cell: (d) => date(d.delivery_date) },
    { key: 'store', header: t('חנות', 'Store'), cell: (d) => model.storeById[d.store_id]?.name || '—' },
    { key: 'model', header: t('מודל', 'Model'), cell: (d) => <ModelBadge model={d.payment_model} /> },
    { key: 'units', header: t('יחידות', 'Units'), sort: (d) => d.total_units, cell: (d) => num(d.total_units) },
    { key: 'value', header: t('שווי', 'Value'), sort: (d) => d.total_value, cell: (d) => money(d.total_value) },
    { key: 'actions', header: '', align: 'end', cell: (d) => <RowActions onEdit={() => setForm(d)} onDelete={() => del.ask(d)} /> },
  ];

  return (
    <>
      <PageHeader title={t('אספקות', 'Deliveries')} actions={<Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('אספקה חדשה', 'New delivery')}</Button>} />
      <PriceTiers />
      <DataTable
        columns={columns} rows={data.deliveries}
        empty={<EmptyState icon={Truck} title={t('אין אספקות עדיין', 'No deliveries yet')} text={t('רשמו אספקה לחנות.', 'Record a delivery to a store.')} />}
      />
      {form && <DeliveryForm delivery={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
    </>
  );
}