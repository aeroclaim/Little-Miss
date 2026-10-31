import React, { useState } from 'react';
import { Plus, Printer, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import SerialBadge from '@/components/shared/SerialBadge';

export default function Deliveries() {
  const { t, num, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const [form, setForm] = useState(null);
  const [printDelivery, setPrintDelivery] = useState(null);
  const del = useDeleteFlow({ run: (id) => remove('deliveries', id), title: () => t('למחוק אספקה?', 'Delete this delivery?') });
  if (!model) return <LoadingBlock />;

  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (d) => d.delivery_date, firstSort: 'desc', cell: (d) => date(d.delivery_date) },
    { key: 'store', header: t('חנות', 'Store'), cell: (d) => model.storeById[d.store_id]?.name || '—' },
    { key: 'model', header: t('מודל', 'Model'), cell: (d) => <ModelBadge model={d.payment_model} /> },
    {
      key: 'packages',
      header: t('חבילות', 'Packages'),
      cell: (delivery) => {
        const ids = delivery.package_ids || (delivery.package_id ? [delivery.package_id] : []);
        const numbers = ids.map((id) => data.packages.find((pkg) => pkg.id === id)?.package_number).filter((number) => number !== undefined);
        return numbers.length ? numbers.map((number) => `#${number}`).join(', ') : '—';
      },
    },
    { key: 'units', header: t('יחידות', 'Units'), sort: (d) => d.total_units, cell: (d) => num(d.total_units) },
    { key: 'value', header: t('שווי', 'Value'), sort: (d) => d.total_value, cell: (d) => money(d.total_value) },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (delivery) => (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" size="icon" variant="ghost" title={t('הדפסת תעודת משלוח', 'Print delivery note')} aria-label={t('הדפסת תעודת משלוח', 'Print delivery note')} onClick={() => setPrintDelivery(delivery)}>
            <Printer className="h-4 w-4" />
          </Button>
          <RowActions onEdit={() => setForm(delivery)} onDelete={() => del.ask(delivery)} />
        </div>
      ),
    },
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
      <Dialog open={!!printDelivery} onOpenChange={(open) => { if (!open) setPrintDelivery(null); }}>
        <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto">
          <DialogTitle>{t('תעודת משלוח', 'Delivery note')}</DialogTitle>
          {printDelivery && (
            <>
              <div data-delivery-print className="space-y-4 rounded-xl border p-5">
                <header className="grid gap-2 sm:grid-cols-2">
                  <p><b>{t('חנות', 'Store')}:</b> {model.storeById[printDelivery.store_id]?.name || '—'}</p>
                  <p><b>{t('תאריך', 'Date')}:</b> {date(printDelivery.delivery_date)}</p>
                  <p><b>{t('אסמכתא', 'Reference')}:</b> {printDelivery.reference || '—'}</p>
                  <p><b>{t('חבילות', 'Packages')}:</b> {(printDelivery.package_ids || (printDelivery.package_id ? [printDelivery.package_id] : []))
                    .map((id) => data.packages.find((pkg) => pkg.id === id)?.package_number).filter((number) => number !== undefined).map((number) => `#${number}`).join(', ') || '—'}</p>
                </header>
                <div className="flex flex-wrap gap-2">
                  {(printDelivery.items || []).map((item) => (
                    <span key={item.serial_number} className="flex items-center gap-1 rounded-full border pe-2">
                      <SerialBadge serial={item.serial_number} size="sm" />×{item.quantity}
                    </span>
                  ))}
                </div>
                <div className="border-t pt-3 text-sm">
                  <b>{printDelivery.total_units || 0} {t('יחידות', 'units')}</b>
                  {' · '}{money(printDelivery.unit_price || 0)} {t('ליחידה', 'per unit')}
                  {' · '}{money(printDelivery.total_value || 0)}
                </div>
              </div>
              <div className="flex justify-end"><Button type="button" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('הדפסה', 'Print')}</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-delivery-print], [data-delivery-print] * { visibility: visible !important; }
          [data-delivery-print] { position: fixed !important; inset: 0 !important; overflow: visible !important; background: white !important; color: black !important; }
          button { display: none !important; }
        }
      `}</style>
    </>
  );
}