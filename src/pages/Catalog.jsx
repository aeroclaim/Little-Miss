import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { collectionLabel, productLabel } from '@/lib/logic/serials';
import { safeHref } from '@/lib/logic/format';
import PageHeader from '@/components/shared/PageHeader';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import RowActions from '@/components/shared/RowActions';
import SerialBadge from '@/components/shared/SerialBadge';
import useDeleteFlow from '@/components/shared/useDeleteFlow';
import CollectionForm from '@/components/catalog/CollectionForm';
import ProductForm from '@/components/catalog/ProductForm';

export default function Catalog() {
  const { t, lang } = useLang();
  const { model } = useAppData();
  const { removeCollection } = useActions();
  const [colForm, setColForm] = useState(null);
  const [prodForm, setProdForm] = useState(null);
  const del = useDeleteFlow({ run: removeCollection, title: (c) => t(`למחוק את "${c.name}"?`, `Delete "${c.name}"?`) });
  if (!model) return <LoadingBlock />;

  const colCols = [
    { key: 'name', header: t('אוסף', 'Collection'), cell: (c) => collectionLabel(c, lang) },
    { key: 'range', header: t('טווח', 'Range'), cell: (c) => <span dir="ltr">{c.serial_from}–{c.serial_to}</span> },
    { key: 'actions', header: '', align: 'end', cell: (c) => <RowActions onEdit={() => setColForm(c)} onDelete={() => del.ask(c)} /> },
  ];
  const prodCols = [
    { key: 'serial', header: t('מספר', 'No.'), sort: (e) => e.serial, cell: (e) => <SerialBadge serial={e.serial} /> },
    { key: 'name', header: t('שם', 'Name'), cell: (e) => productLabel(e, lang) || '—' },
    { key: 'collection', header: t('אוסף', 'Collection'), cell: (e) => collectionLabel(e.collection, lang) },
    {
      key: 'link', header: t('קובץ', 'File'),
      cell: (e) => {
        const href = safeHref(e.product?.file_link);
        return href ? <a href={href} target="_blank" rel="noreferrer" className="text-indigo-700 underline" onClick={(ev) => ev.stopPropagation()}>{t('פתיחה', 'Open')}</a> : '—';
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t('קטלוג', 'Catalog')}
        subtitle={t('אוסף הוא טווח רציף של מספרים סידוריים.', 'A collection is a consecutive range of serial numbers.')}
        actions={<Button onClick={() => setColForm({})}><Plus className="h-4 w-4" />{t('אוסף חדש', 'New collection')}</Button>}
      />
      {!model.collections.length ? (
        <EmptyState icon={BookOpen} title={t('אין אוספים עדיין', 'No collections yet')} text={t('הוסיפו אוסף כמו "אוכל" עם טווח 1–14.', 'Add a collection with a number range, e.g. 1–14.')} />
      ) : (
        <div className="space-y-6">
          <Section title={t('אוספים', 'Collections')} bodyClassName="p-0">
            <DataTable columns={colCols} rows={model.collections} className="border-0 shadow-none" />
          </Section>
          <Section title={t('מספרים', 'Numbers')} description={t('לחצו על שורה לעריכת שם וקישור', 'Click a row to edit name and link')} bodyClassName="p-0">
            <DataTable columns={prodCols} rows={model.catalog.map((e) => ({ ...e, id: e.serial }))} onRowClick={setProdForm} className="border-0 shadow-none" />
          </Section>
        </div>
      )}
      {colForm && <CollectionForm collection={colForm.id ? colForm : null} onClose={() => setColForm(null)} />}
      {prodForm && <ProductForm entry={prodForm} onClose={() => setProdForm(null)} />}
      {del.dialog}
    </>
  );
}