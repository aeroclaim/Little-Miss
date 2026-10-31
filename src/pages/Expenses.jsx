import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Plus, Printer, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { dataLayer } from '@/data/dataLayer';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import ExpenseForm, { expenseCategoryLabel } from '@/components/expenses/ExpenseForm';

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadExpensesCsv(rows, t) {
  const contents = `\uFEFF${[
    [t('תאריך', 'Date'), t('קטגוריה', 'Category'), t('תיאור', 'Description'), t('ספק', 'Provider'), t('סכום', 'Amount'), t('מקור', 'Source'), t('קבלה', 'Receipt')],
    ...rows.map((row) => [row.date, row.categoryLabel, row.description, row.vendor, row.amount, row.sourceLabel, row.receipt_file ? t('מצורף', 'Attached') : '']),
  ].map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `littlemiss-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Expenses() {
  const { t, money, date } = useLang();
  const { data, model } = useAppData();
  const { remove } = useActions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptError, setReceiptError] = useState('');
  const [openingReceipt, setOpeningReceipt] = useState(false);

  const del = useDeleteFlow({
    run: (id) => remove('expenses', id),
    title: () => t('למחוק הוצאה?', 'Delete this expense?'),
  });

  const rows = useMemo(() => [
    ...(data.expenses || []).map((expense) => ({
      id: expense.id,
      source: 'manual',
      date: expense.expense_date,
      category: expense.category,
      categoryLabel: expenseCategoryLabel(expense.category, t),
      description: expense.description,
      vendor: expense.vendor || '',
      amount: Number(expense.amount) || 0,
      receipt_file: expense.receipt_file || '',
      notes: expense.notes || '',
      sourceLabel: t('הוצאה ידנית', 'Manual expense'),
      record: expense,
    })),
    ...(data.printOrders || []).filter((order) => Number(order.total_price) > 0).map((order) => ({
      id: `print-${order.id}`,
      source: 'print',
      date: order.order_date,
      category: 'printing',
      categoryLabel: t('הדפסה', 'Printing'),
      description: order.reference ? `${order.provider || t('בית דפוס', 'Print house')} · ${order.reference}` : order.provider || t('הזמנת הדפסה', 'Print order'),
      vendor: order.provider || '',
      amount: Number(order.total_price) || 0,
      receipt_file: '',
      notes: order.notes || '',
      sourceLabel: t('הזמנת הדפסה מקושרת', 'Linked print order'),
      record: order,
    })),
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [data.expenses, data.printOrders, t]);

  const totalMisc = (data.expenses || []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const printCost = model?.totals.printCost || 0;
  const totalExpenses = totalMisc + printCost;
  const categoryTotals = useMemo(() => {
    const totals = new Map();
    for (const row of rows) totals.set(row.categoryLabel, (totals.get(row.categoryLabel) || 0) + row.amount);
    return [...totals].map(([category, amount]) => ({ id: category, category, amount })).sort((a, b) => b.amount - a.amount);
  }, [rows]);

  useEffect(() => () => {
    if (receiptPreview?.url?.startsWith('blob:')) URL.revokeObjectURL(receiptPreview.url);
  }, [receiptPreview]);

  if (!model) return <LoadingBlock />;

  const openReceipt = async (row) => {
    setOpeningReceipt(true);
    setReceiptError('');
    try {
      const asset = await dataLayer.resolveFileAsset(row.receipt_file);
      setReceiptPreview({ ...asset, title: row.description });
    } catch (error) {
      setReceiptError(error.message || t('לא ניתן לפתוח את הקבלה.', 'Could not open the receipt.'));
    } finally {
      setOpeningReceipt(false);
    }
  };

  const columns = [
    { key: 'date', header: t('תאריך', 'Date'), sort: (row) => row.date, firstSort: 'desc', cell: (row) => date(row.date) },
    { key: 'category', header: t('קטגוריה', 'Category'), sort: (row) => row.categoryLabel, cell: (row) => row.categoryLabel },
    { key: 'description', header: t('תיאור', 'Description'), cell: (row) => <span className="font-medium">{row.description || '—'}</span> },
    { key: 'source', header: t('מקור', 'Source'), cell: (row) => <span className="text-xs text-muted-foreground">{row.sourceLabel}</span> },
    { key: 'amount', header: t('סכום', 'Amount'), align: 'end', sort: (row) => row.amount, cell: (row) => <b>{money(row.amount)}</b> },
    {
      key: 'receipt',
      header: t('קבלה', 'Receipt'),
      align: 'center',
      cell: (row) => row.receipt_file
        ? <Button type="button" size="sm" variant="outline" disabled={openingReceipt} onClick={() => openReceipt(row)}><FileText className="h-4 w-4" />{t('פתיחה', 'Open')}</Button>
        : '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (row) => row.source === 'manual'
        ? <RowActions onEdit={() => setForm(row.record)} onDelete={() => del.ask(row.record)} />
        : <span className="text-xs text-muted-foreground">{t('מקושר', 'Linked')}</span>,
    },
  ];

  const totals = { amount: money(totalExpenses) };

  return (
    <>
      <PageHeader
        title={t('הוצאות', 'Expenses')}
        subtitle={t('הוצאות ידניות יחד עם עלויות הדפסה המקושרות להזמנות, ללא רישום כפול.', 'Manual expenses and linked print-order costs, without duplicating print expenses.')}
        actions={
          <>
            <Button type="button" variant="outline" disabled={!rows.length} onClick={() => downloadExpensesCsv(rows, t)}><Download className="h-4 w-4" />CSV</Button>
            <Button type="button" variant="outline" disabled={!rows.length} onClick={() => window.print()}><Printer className="h-4 w-4" />{t('הדפסה', 'Print')}</Button>
            <Button onClick={() => setForm({})}><Plus className="h-4 w-4" />{t('הוצאה חדשה', 'New expense')}</Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('סה״כ הוצאות רשומות', 'Total recorded expenses')} value={money(totalExpenses)} icon={Wallet} tone="rose" />
        <StatCard label={t('הדפסות מקושרות', 'Linked print costs')} value={money(printCost)} icon={FileText} />
        <StatCard label={t('הוצאות ידניות', 'Manual expenses')} value={money(totalMisc)} icon={Receipt} tone="amber" />
      </div>
      <Section title={t('סיכום לפי קטגוריה', 'Totals by category')} bodyClassName="p-0">
        <DataTable
          columns={[
            { key: 'category', header: t('קטגוריה', 'Category') },
            { key: 'amount', header: t('סה״כ', 'Total'), align: 'end', sort: (row) => row.amount, cell: (row) => money(row.amount) },
          ]}
          rows={categoryTotals}
          empty={<p className="p-5 text-sm text-muted-foreground">{t('אין הוצאות רשומות.', 'No recorded expenses.')}</p>}
          className="border-0 shadow-none"
        />
      </Section>
      <div data-expenses-print className="mt-6">
        <h2 className="mb-3 hidden text-xl font-bold print:block">{t('הוצאות', 'Expenses')}</h2>
        <Section title={t('רישום הוצאות', 'Expense ledger')} bodyClassName="p-0">
          <DataTable
            columns={columns}
            rows={rows}
            totals={totals}
            className="border-0 shadow-none"
            empty={<EmptyState icon={Receipt} title={t('אין הוצאות עדיין', 'No expenses yet')} text={t('עלויות הדפסה יופיעו כאן אוטומטית. אפשר גם לרשום הוצאה ידנית.', 'Print costs appear here automatically. You can also add expenses manually.')} />}
          />
        </Section>
      </div>
      {form && <ExpenseForm expense={form.id ? form : null} onClose={() => setForm(null)} />}
      {del.dialog}
      {receiptError && <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{receiptError}</p>}
      <Dialog open={!!receiptPreview} onOpenChange={(open) => { if (!open) setReceiptPreview(null); }}>
        <DialogContent className="max-h-[94vh] max-w-5xl">
          <DialogTitle>{receiptPreview?.title}</DialogTitle>
          {receiptPreview?.type === 'application/pdf'
            ? <iframe title={receiptPreview.title} src={receiptPreview.url} className="h-[78vh] w-full rounded-lg bg-white" />
            : receiptPreview && <img alt={receiptPreview.title} src={receiptPreview.url} className="mx-auto max-h-[78vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [data-expenses-print], [data-expenses-print] * { visibility: visible !important; }
          [data-expenses-print] { position: fixed !important; inset: 0 !important; overflow: visible !important; background: white !important; color: black !important; }
          [data-expenses-print] button { display: none !important; }
        }
      `}</style>
    </>
  );
}
