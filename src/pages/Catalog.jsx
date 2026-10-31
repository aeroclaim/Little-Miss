import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, ListChecks, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { dataLayer } from '@/data/dataLayer';
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
import CatalogBulkEditDialog from '@/components/catalog/CatalogBulkEditDialog';

function fileTypeFromLink(link) {
  const path = String(link || '').split(/[?#]/, 1)[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'application/pdf';
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/.test(path)) return 'image';
  return '';
}

async function resolvePreviewAsset(fileRef) {
  const directUrl = safeHref(fileRef);
  const localReference = /^(local-file:|file:\/\/|[a-z]:[\\/]|\\\\)/i.test(fileRef);
  return directUrl && !localReference
    ? { url: directUrl, type: fileTypeFromLink(fileRef) }
    : dataLayer.resolveFileAsset(fileRef);
}

function FileThumbnail({ fileRef, name, label, unavailableLabel, onPreview, className = 'h-12 w-12' }) {
  const [asset, setAsset] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;
    setAsset(null);
    setFailed(false);

    async function resolveAsset() {
      const directUrl = safeHref(fileRef);
      const localReference = /^(local-file:|file:\/\/|[a-z]:[\\/]|\\\\)/i.test(fileRef);
      const resolved = directUrl && !localReference
        ? { url: directUrl, type: fileTypeFromLink(fileRef) }
        : await dataLayer.resolveFileAsset(fileRef);
      if (!active) {
        if (resolved.url.startsWith('blob:')) URL.revokeObjectURL(resolved.url);
        return;
      }
      if (resolved.url.startsWith('blob:')) objectUrl = resolved.url;
      setAsset(resolved);
    }

    resolveAsset().catch(() => {
      if (active) setFailed(true);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileRef]);

  if (!asset && !failed) {
    return <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg border bg-muted/50" aria-label={label} />;
  }

  const type = asset?.type || fileTypeFromLink(fileRef);
  if (asset && type === 'application/pdf') {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`flex ${className} shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-white text-muted-foreground transition hover:ring-2 hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        onClick={(event) => { event.stopPropagation(); onPreview(asset, name); }}
      >
        <FileText className="h-6 w-6" aria-hidden="true" />
        <span className="text-[10px] font-semibold">PDF</span>
      </button>
    );
  }

  if (asset && !failed && (type === 'image' || type.startsWith('image/') || !type)) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50 transition hover:ring-2 hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        onClick={(event) => { event.stopPropagation(); onPreview(asset, name); }}
      >
        <img src={asset.url} alt={name} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        aria-label={label}
        title={label}
        className={`flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50`}
      >
        <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </span>
      {!asset && <span className="text-sm text-muted-foreground">{unavailableLabel}</span>}
    </div>
  );
}

export default function Catalog() {
  const { t, lang } = useLang();
  const { data, model } = useAppData();
  const { removeCollection, bulkConfigureProducts } = useActions();
  const queryClient = useQueryClient();
  const [colForm, setColForm] = useState(null);
  const [prodForm, setProdForm] = useState(null);
  const [selectedSerials, setSelectedSerials] = useState(new Set());
  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewUrlRef = useRef(null);
  const previewRequestRef = useRef(0);
  const previewItems = useMemo(
    () => (model?.catalog || []).filter((entry) => String(entry.product?.file_link || '').trim()),
    [model?.catalog]
  );
  const catalogGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of model?.catalog || []) {
      const key = entry.collection?.id || '__uncategorized';
      if (!groups.has(key)) groups.set(key, { key, collection: entry.collection, entries: [] });
      groups.get(key).entries.push(entry);
    }
    return [...groups.values()];
  }, [model?.catalog]);
  const del = useDeleteFlow({
    run: removeCollection,
    title: (c) => t(`למחוק את "${c.name}"?`, `Delete "${c.name}"?`),
    onDeleted: () => setColForm(null),
  });

  const navigatePreview = useCallback(async (index) => {
    const entry = previewItems[index];
    if (!entry) return;
    const request = previewRequestRef.current + 1;
    previewRequestRef.current = request;
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const fileRef = String(entry.product.file_link).trim();
      const asset = await resolvePreviewAsset(fileRef);
      if (request !== previewRequestRef.current) {
        if (asset.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
        return;
      }
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = asset.url.startsWith('blob:') ? asset.url : null;
      setPreview({ ...asset, title: productLabel(entry, lang) || t('קובץ מוצר', 'Product file'), serial: entry.serial });
      setPreviewIndex(index);
    } catch (error) {
      if (request === previewRequestRef.current) {
        setPreviewError(error.message || t('לא ניתן לפתוח את הקובץ.', 'Could not open this file.'));
      }
    } finally {
      if (request === previewRequestRef.current) setPreviewLoading(false);
    }
  }, [lang, previewItems, t]);

  const closePreview = useCallback(() => {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreview(null);
    setPreviewIndex(-1);
    setPreviewError('');
    setPreviewLoading(false);
  }, []);

  useEffect(() => () => {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft' && previewIndex > 0) {
        event.preventDefault();
        navigatePreview(previewIndex - 1);
      } else if (event.key === 'ArrowRight' && previewIndex < previewItems.length - 1) {
        event.preventDefault();
        navigatePreview(previewIndex + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigatePreview, preview, previewIndex, previewItems.length]);

  if (!model) return <LoadingBlock />;

  const colCols = [
    { key: 'name', header: t('אוסף', 'Collection'), cell: (c) => collectionLabel(c, lang) },
    { key: 'range', header: t('טווח', 'Range'), cell: (c) => <span dir="ltr">{c.serial_from}–{c.serial_to}</span> },
    { key: 'actions', header: '', align: 'end', cell: (c) => <RowActions onEdit={() => setColForm(c)} /> },
  ];

  const toggleSerial = (serial) => {
    setSelectedSerials((current) => {
      const next = new Set(current);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };
  const toggleSerials = (serials) => {
    setSelectedSerials((current) => {
      const next = new Set(current);
      const add = !serials.every((serial) => next.has(serial));
      for (const serial of serials) {
        if (add) next.add(serial);
        else next.delete(serial);
      }
      return next;
    });
  };
  const applyBulkEdit = async (serials, changes) => {
    setBulkSaving(true);
    const result = await bulkConfigureProducts(serials, changes);
    if (result.ok) {
      setSelectedSerials(new Set());
      await queryClient.invalidateQueries();
    }
    setBulkSaving(false);
    return result;
  };

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
          <Section title={t('מספרים', 'Numbers')} description={t('לחצו על תמונה לתצוגה מקדימה; לעריכה לחצו על העיפרון. אפשר לבחור כמה פריטים או אוסף שלם להגדרה מרובה.', 'Click a thumbnail to preview; use the pencil button to edit. Select individual items or an entire collection for bulk configuration.')} bodyClassName="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
              <Button type="button" size="sm" variant="outline" onClick={() => toggleSerials(model.catalog.map((entry) => entry.serial))}>
                {selectedSerials.size === model.catalog.length ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                {selectedSerials.size === model.catalog.length ? t('ביטול בחירה', 'Clear selection') : t('בחירת כל המספרים', 'Select all numbers')}
              </Button>
              {catalogGroups.map((group) => {
                const serials = group.entries.map((entry) => entry.serial);
                const selected = serials.length > 0 && serials.every((serial) => selectedSerials.has(serial));
                return (
                  <Button key={group.key} type="button" size="sm" variant={selected ? 'secondary' : 'outline'} aria-pressed={selected} onClick={() => toggleSerials(serials)}>
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {collectionLabel(group.collection, lang)} ({serials.length})
                  </Button>
                );
              })}
              <span className="text-sm text-muted-foreground" aria-live="polite">{t(`נבחרו ${selectedSerials.size}`, `${selectedSerials.size} selected`)}</span>
              <Button type="button" size="sm" disabled={!selectedSerials.size} onClick={() => setBulkEdit(true)}>
                {t('הגדרה מרובה', 'Bulk configure')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {model.catalog.map((entry) => {
                const name = productLabel(entry, lang) || t('קובץ מוצר', 'Product file');
                const fileRef = String(entry.product?.file_link || '').trim();
                return (
                  <article key={entry.serial} className={`overflow-hidden rounded-xl border bg-card ${selectedSerials.has(entry.serial) ? 'ring-2 ring-brand' : ''}`}>
                    <div className="relative flex h-40 items-center justify-center bg-muted/30 p-2">
                      <label className="absolute start-3 top-3 z-10 rounded-lg border bg-background/95 p-1.5 shadow-sm" title={t('בחירת פריט', 'Select item')}>
                        <Checkbox checked={selectedSerials.has(entry.serial)} onCheckedChange={() => toggleSerial(entry.serial)} aria-label={t(`בחירת מספר ${entry.serial}`, `Select number ${entry.serial}`)} />
                      </label>
                      {fileRef ? (
                        <FileThumbnail
                          key={fileRef}
                          fileRef={fileRef}
                          name={name}
                          label={t(`תצוגה מקדימה: ${name}`, `Preview: ${name}`)}
                          unavailableLabel={t('קובץ לא זמין', 'File unavailable')}
                          onPreview={() => navigatePreview(previewItems.findIndex((item) => item.serial === entry.serial))}
                          className="h-full w-full rounded-lg"
                        />
                      ) : (
                        <FileText className="h-9 w-9 text-muted-foreground/50" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <SerialBadge serial={entry.serial} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{productLabel(entry, lang) || '—'}</p>
                          <p className="truncate text-xs text-muted-foreground">{collectionLabel(entry.collection, lang)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {entry.product?.not_for_sale && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">{t('חסום', 'Blocked')}</span>}
                        {entry.product?.distribution_paused && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900">{t('מושהה', 'Paused')}</span>}
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t('עריכת פריט', 'Edit item')} title={t('עריכה', 'Edit')} onClick={() => setProdForm(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>
        </div>
      )}
      {colForm && <CollectionForm collection={colForm.id ? colForm : null} onClose={() => setColForm(null)} onDelete={colForm.id ? () => del.ask(colForm) : undefined} />}
      {prodForm && <ProductForm entry={prodForm} onClose={() => setProdForm(null)} />}
      {bulkEdit && <CatalogBulkEditDialog entries={model.catalog.filter((entry) => selectedSerials.has(entry.serial))} towns={data.towns || []} onApply={applyBulkEdit} saving={bulkSaving} onClose={() => setBulkEdit(false)} />}
      {del.dialog}
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-h-[96vh] max-w-6xl border-0 bg-background p-3 shadow-2xl [&>button:last-child]:z-10 [&>button:last-child]:flex [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-white [&>button:last-child]:text-black [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-lg">
          {preview && (
            <>
              <DialogTitle className="pe-12 text-start text-lg font-semibold">{preview.title} · {preview.serial}</DialogTitle>
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" size="icon" aria-label={t('הקודם', 'Previous')} onClick={() => navigatePreview(previewIndex - 1)} disabled={previewIndex <= 0 || previewLoading}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground" dir="ltr">{previewIndex + 1} / {previewItems.length}</span>
                <Button type="button" variant="outline" size="icon" aria-label={t('הבא', 'Next')} onClick={() => navigatePreview(previewIndex + 1)} disabled={previewIndex >= previewItems.length - 1 || previewLoading}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {previewError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{previewError}</p>}
              {preview.type === 'application/pdf' ? (
                <iframe src={preview.url} title={preview.title} className="h-[76vh] w-full rounded-lg bg-white" />
              ) : (
                <img src={preview.url} alt={preview.title} className={`mx-auto max-h-[76vh] w-full rounded-lg object-contain ${previewLoading ? 'opacity-50' : ''}`} />
              )}
              {previewLoading && <p className="text-center text-sm text-muted-foreground">{t('טוען...', 'Loading...')}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}