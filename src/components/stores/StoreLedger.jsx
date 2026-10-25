import React from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { buildLedger } from '@/lib/logic/finance';
import DataTable from '@/components/shared/DataTable';
import ModelBadge from '@/components/shared/ModelBadge';

const KIND = {
  delivery: ['אספקה', 'Delivery'],
  sale: ['דיווח מכירה', 'Sales report'],
  return: ['החזרה', 'Return'],
  payment: ['תשלום', 'Payment'],
};

// Chronological account of one store with a running balance (latest first).
export default function StoreLedger({ storeId }) {
  const { t, num, money, date } = useLang();
  const { data } = useAppData();
  const rows = buildLedger(storeId, data).reverse().map((r) => ({ ...r, id: `${r.kind}-${r.id}` }));

  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), cell: (r) => date(r.date) },
    {
      key: 'kind', header: t('סוג', 'Type'),
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          {t(...KIND[r.kind])}
          {r.kind === 'delivery' && <ModelBadge model={r.model} />}
        </span>
      ),
    },
    { key: 'units', header: t('יחידות', 'Units'), cell: (r) => (r.units ? num(r.units) : '—') },
    { key: 'charge', header: t('חיוב', 'Charge'), cell: (r) => (r.charge ? money(r.charge) : '—') },
    { key: 'credit', header: t('זיכוי / תשלום', 'Credit / payment'), cell: (r) => (r.credit ? money(r.credit) : '—') },
    { key: 'balance', header: t('יתרה', 'Balance'), cell: (r) => <b className="tabular-nums">{money(r.balance)}</b> },
  ];

  return (
    <DataTable
      columns={columns} rows={rows} className="border-0 shadow-none"
      empty={<p className="p-8 text-center text-sm text-muted-foreground">{t('עדיין אין פעילות מול החנות.', 'No activity with this store yet.')}</p>}
    />
  );
}