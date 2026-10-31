import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CircleX, Download, Package, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { dataLayer } from '@/data/dataLayer';
import { useAppData, QUERY_KEY } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { generatePackageContents, packageBreakdown, packageBreakdownGroups, townAssignments } from '@/lib/logic/packages';
import { todayISO } from '@/lib/logic/format';
import PageHeader from '@/components/shared/PageHeader';
import Section from '@/components/shared/Section';
import LoadingBlock from '@/components/shared/LoadingBlock';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import PackageBatchForm from '@/components/packages/PackageBatchForm';

const DEFAULT_RECIPES = [
  { group: 'assigned', number_count: '10', copies_each: '10' },
  { group: 'outside', number_count: '30', copies_each: '1' },
];

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(packages, t) {
  const rows = [
    [t('מספר חבילה', 'Package number'), t('עיר', 'Town'), t('מספרים', 'Serial numbers'), t('פירוט כמויות', 'Quantity breakdown'), t('סה״כ יחידות', 'Total units')],
    ...packages.map((pkg) => [
      pkg.package_number,
      pkg.town,
      (pkg.items || []).map((item) => item.serial_number).join(', '),
      packageBreakdown(pkg.items),
      pkg.total_units,
    ]),
  ];
  const contents = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `littlemiss-packages-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function PackageQuantityGroups({ items, t, compact = false }) {
  const groups = packageBreakdownGroups(items);
  if (!groups.length) return <span>—</span>;
  return (
    <div className={compact ? 'package-quantity-groups package-quantity-groups-compact' : 'package-quantity-groups'}>
      {groups.map(({ quantity, serials }) => (
        <div key={quantity} className="package-quantity-group">
          <strong>{t('כמות לכל מספר', 'Copies each')}: {quantity}</strong>
          <span className="package-quantity-serials">{serials.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

function printablePackages(packages, mode, batch, t, printOutput = false) {
  const rows = Math.max(1, Number(batch?.label_rows) || 8);
  const columns = Math.max(1, Number(batch?.label_columns) || 3);
  const perSheet = rows * columns;
  const pages = [];
  for (let index = 0; index < packages.length; index += perSheet) pages.push(packages.slice(index, index + perSheet));

  return (
    <div
      {...(printOutput ? { 'data-package-print-output': '' } : {})}
      className={`package-print-root ${printOutput ? 'package-print-output' : 'package-print-preview'}`}
    >
      {mode === 'list' ? (
        <div className="package-list-print">
          <h1 className="mb-5 text-2xl font-bold">{t('רשימת חבילות', 'Package list')}</h1>
          <div className="package-list-cards">
            {packages.map((pkg) => (
              <article key={pkg.id} className="package-list-card">
                <header className="package-list-card-header">
                  <h2>{t('חבילה', 'Package')} #{pkg.package_number}</h2>
                  <span>{pkg.town}</span>
                  <b>{t('סה״כ יחידות', 'Total units')}: {pkg.total_units}</b>
                </header>
                <PackageQuantityGroups items={pkg.items} t={t} />
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              data-package-sheet
              className="package-label-sheet"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
            >
              {page.map((pkg) => (
                <article key={pkg.id} className="package-label">
                  <p className="package-label-number">{t('חבילה', 'Package')} #{pkg.package_number}</p>
                  <p className="package-label-town">{pkg.town}</p>
                  <p><b>{t('סה״כ', 'Total')}:</b> {pkg.total_units}</p>
                  <PackageQuantityGroups items={pkg.items} t={t} compact />
                </article>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Packages() {
  const { t, lang } = useLang();
  const { data, model } = useAppData();
  const queryClient = useQueryClient();
  const [activeBatchId, setActiveBatchId] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [labelRows, setLabelRows] = useState('8');
  const [labelColumns, setLabelColumns] = useState('3');
  const [printMode, setPrintMode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);
  const [deleteSelectionOpen, setDeleteSelectionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const batches = data.packageBatches || [];
  const packages = data.packages || [];
  const activeBatch = useMemo(
    () => activeBatchId ? batches.find((batch) => batch.id === activeBatchId) || null : batches[0] || null,
    [batches, activeBatchId]
  );
  const batchPackages = useMemo(
    () => packages.filter((pkg) => pkg.batch_id === activeBatch?.id).sort((a, b) => a.package_number - b.package_number),
    [packages, activeBatch?.id]
  );
  const selectablePackages = useMemo(() => batchPackages.filter((pkg) => pkg.status !== 'cancelled'), [batchPackages]);
  const selectedBuildPackages = useMemo(
    () => selectablePackages.filter((pkg) => selectedIds.includes(pkg.id) && ['draft', 'ready'].includes(pkg.status)),
    [selectablePackages, selectedIds]
  );
  const selectedExportPackages = useMemo(
    () => selectablePackages.filter((pkg) => selectedIds.includes(pkg.id) && ['ready', 'delivered'].includes(pkg.status)),
    [selectablePackages, selectedIds]
  );

  useEffect(() => {
    if (!activeBatchId && activeBatch) setActiveBatchId(activeBatch.id);
    if (activeBatch) {
      setLabelRows(String(activeBatch.label_rows || 8));
      setLabelColumns(String(activeBatch.label_columns || 3));
    }
  }, [activeBatch, activeBatchId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => selectablePackages.some((pkg) => pkg.id === id)));
  }, [selectablePackages]);

  if (!model) return <LoadingBlock />;

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const togglePackage = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]);

  const createBatch = async (townCounts) => {
    setSaving(true);
    setError('');
    try {
      const savedTownNames = new Set((data.towns || []).map((town) => String(town.name || '').trim().toLocaleLowerCase()));
      for (const { town } of townCounts) {
        const townName = String(town || '').trim();
        const townKey = townName.toLocaleLowerCase();
        if (townName && !savedTownNames.has(townKey)) {
          await dataLayer.create('towns', { name: townName, assigned_serials: [], notes: '' });
          savedTownNames.add(townKey);
        }
      }
      const batch = await dataLayer.create('packageBatches', {
        batch_date: todayISO(),
        town_counts: townCounts,
        label_rows: 8,
        label_columns: 3,
      });
      const firstNumber = packages.reduce((maximum, pkg) => Math.max(maximum, Number(pkg.package_number) || 0), 0) + 1;
      const newPackages = townCounts.flatMap(({ town, count }, townIndex) =>
        Array.from({ length: count }, (_, packageIndex) => ({
          batch_id: batch.id,
          package_number: firstNumber + townCounts.slice(0, townIndex).reduce((sum, item) => sum + item.count, 0) + packageIndex,
          town,
          items: [],
          total_units: 0,
          status: 'draft',
        }))
      );
      await dataLayer.bulkCreate('packages', newPackages);
      setActiveBatchId(batch.id);
      setCreating(false);
      await refresh();
    } catch (createError) {
      setError(createError.message || t('יצירת החבילות נכשלה.', 'Could not create the package batch.'));
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    const targets = selectedBuildPackages;
    if (!targets.length) return;
    setSaving(true);
    setError('');
    try {
      const validRecipes = recipes
        .map((recipe) => ({ ...recipe, number_count: Math.floor(Number(recipe.number_count)), copies_each: Math.floor(Number(recipe.copies_each)) }))
        .filter((recipe) => recipe.number_count > 0 && recipe.copies_each > 0);
      if (!validRecipes.length) throw new Error(t('הוסיפו לפחות שורת הרכב אחת עם מספרים וכמויות.', 'Add at least one recipe line with a number count and copies.'));
      const withAssignments = targets.map((pkg) => {
        return {
          ...pkg,
          assigned_serials: townAssignments(pkg.town, Object.values(model.townByName)),
        };
      });
      const generated = generatePackageContents({
        packages: withAssignments,
        recipes: validRecipes,
        catalog: model.catalog,
        stock: model.stock,
        existingPackages: packages,
      });
      for (const pkg of generated) {
        await dataLayer.update('packages', pkg.id, {
          items: pkg.items,
          total_units: pkg.total_units,
          status: pkg.status,
        });
      }
      await refresh();
    } catch (generationError) {
      setError(generationError.message || t('יצירת תכולת החבילות נכשלה.', 'Could not generate package contents.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelPackage = async (pkg) => {
    if (!window.confirm(t(`לבטל את חבילה ${pkg.package_number}? המלאי השמור ישתחרר.`, `Cancel package ${pkg.package_number}? Its reserved stock will be released.`))) return;
    try {
      await dataLayer.update('packages', pkg.id, { status: 'cancelled' });
      await refresh();
    } catch (cancelError) {
      setError(cancelError.message || t('ביטול החבילה נכשל.', 'Could not cancel the package.'));
    }
  };

  const deletePackage = async () => {
    if (!deleteTarget) return;
    await deletePackages([deleteTarget]);
  };

  const deletePackages = async (targetPackages, batch = null) => {
    const protectedPackages = targetPackages.filter((pkg) => pkg.status === 'delivered');
    if (protectedPackages.length) {
      setError(t(
        'לא ניתן למחוק חבילות שכבר סופקו; רשומת האספקה נשמרת בהיסטוריה.',
        'Delivered packages cannot be deleted because their delivery records are retained.'
      ));
      return false;
    }
    setDeleting(true);
    setError('');
    try {
      for (const pkg of targetPackages) await dataLayer.remove('packages', pkg.id);
      if (batch) await dataLayer.remove('packageBatches', batch.id);
      const removedIds = new Set(targetPackages.map((pkg) => pkg.id));
      setSelectedIds((current) => current.filter((id) => !removedIds.has(id)));
      setDeleteTarget(null);
      setDeleteBatchTarget(null);
      setDeleteSelectionOpen(false);
      await refresh();
      return true;
    } catch (deleteError) {
      setError(deleteError.message || t('מחיקת החבילות נכשלה.', 'Could not delete the packages.'));
      await refresh();
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const deletableSelectedPackages = batchPackages.filter((pkg) => selectedIds.includes(pkg.id) && pkg.status !== 'delivered');
  const deleteSelectedPackages = () => deletePackages(deletableSelectedPackages);

  const deleteBatch = () => {
    if (!deleteBatchTarget) return;
    deletePackages(
      packages.filter((pkg) => pkg.batch_id === deleteBatchTarget.id),
      deleteBatchTarget
    );
  };

  const updateLabels = async (key, value) => {
    const normalized = String(Math.max(1, Math.min(20, Math.floor(Number(value) || 1))));
    if (key === 'label_rows') setLabelRows(normalized);
    else setLabelColumns(normalized);
    try {
      await dataLayer.update('packageBatches', activeBatch.id, { [key]: Number(normalized) });
      await refresh();
    } catch (updateError) {
      setError(updateError.message || t('שמירת פריסת המדבקות נכשלה.', 'Could not save the label layout.'));
    }
  };

  const changeRecipe = (index, key, value) => setRecipes((current) => current.map((recipe, i) => i === index ? { ...recipe, [key]: value } : recipe));

  return (
    <>
      <PageHeader
        title={t('אריזת חבילות', 'Package builder')}
        subtitle={t('תכנון חבילות לפי עיר, שמירת מלאי והכנת רשימות ומדבקות.', 'Plan packages by town, reserve stock, and prepare lists and labels.')}
        actions={<Button onClick={() => setCreating(true)} disabled={!model.towns.length}><Plus className="h-4 w-4" />{t('תכנון הפצה חדשה', 'Plan new batch')}</Button>}
      />
      {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!batches.length ? (
        <EmptyState icon={Package} title={t('אין חבילות עדיין', 'No package batches yet')} text={t('תכננו כמות חבילות לכל עיר כדי להתחיל.', 'Plan how many packages to prepare for each town to get started.')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Section title={t('הפצות מתוכננות', 'Planned batches')} bodyClassName="space-y-2">
            {batches.map((batch) => {
              const count = packages.filter((pkg) => pkg.batch_id === batch.id).length;
              return (
                <div key={batch.id} className={`flex items-center gap-2 rounded-lg border p-2 ${activeBatch?.id === batch.id ? 'border-brand ring-1 ring-brand' : ''}`}>
                  <button type="button" onClick={() => setActiveBatchId(batch.id)} className="min-w-0 flex-1 p-1 text-start hover:bg-muted/50">
                    <span className="block font-medium">{batch.batch_date}</span>
                    <span className="text-xs text-muted-foreground">{count} {t('חבילות', 'packages')}</span>
                  </button>
                  <Button type="button" variant="ghost" size="icon" title={t('מחיקת כל האצווה', 'Delete entire batch')} aria-label={t('מחיקת כל האצווה', 'Delete entire batch')} onClick={() => setDeleteBatchTarget(batch)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </Section>
          {activeBatch && (
            <div className="space-y-5">
              <Section title={t('הגדרת תכולה', 'Package recipe')} description={t('מספרים שונים לכל חבילה; הכמות היא מספר עותקים מכל מספר.', 'Distinct numbers per package; copies is the amount of each number.')} bodyClassName="space-y-4">
                <div className="space-y-2">
                  {recipes.map((recipe, index) => (
                    <div key={index} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(145px,0.8fr)_minmax(145px,0.8fr)_auto]">
                      <label className="space-y-1.5 text-sm font-medium">
                        <span>{t('סוג המספרים', 'Number group')}</span>
                        <Select value={recipe.group} onValueChange={(value) => changeRecipe(index, 'group', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assigned">{t('מספרים של העיר', 'Town-assigned numbers')}</SelectItem>
                            <SelectItem value="outside">{t('מספרים מחוץ לעיר', 'Out-of-town numbers')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        <span>{t('מספר וריאציות שונות', 'Different variations')}</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          dir="ltr"
                          value={recipe.number_count}
                          onChange={(event) => changeRecipe(index, 'number_count', event.target.value === '' ? '' : String(Math.max(0, Math.floor(Number(event.target.value) || 0))))}
                          onBlur={(event) => changeRecipe(index, 'number_count', String(Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                          aria-label={t('מספר וריאציות שונות', 'Number of distinct variations')}
                        />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        <span>{t('עותקים לכל וריאציה', 'Copies per variation')}</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          dir="ltr"
                          value={recipe.copies_each}
                          onChange={(event) => changeRecipe(index, 'copies_each', event.target.value === '' ? '' : String(Math.max(0, Math.floor(Number(event.target.value) || 0))))}
                          onBlur={(event) => changeRecipe(index, 'copies_each', String(Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                          aria-label={t('עותקים לכל וריאציה', 'Copies per variation')}
                        />
                      </label>
                      <Button type="button" variant="outline" onClick={() => setRecipes((current) => current.filter((_, i) => i !== index))}>{t('הסרה', 'Remove')}</Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setRecipes((current) => [...current, { group: 'assigned', number_count: '1', copies_each: '1' }])}>
                    <Plus className="h-4 w-4" />{t('שורת הרכב', 'Add recipe line')}
                  </Button>
                  <Button type="button" disabled={saving || !selectedBuildPackages.length} onClick={generate}>
                    <RefreshCw className="h-4 w-4" />{saving ? t('מכין...', 'Preparing...') : t(`יצירת תכולה ל-${selectedBuildPackages.length} חבילות`, `Generate ${selectedBuildPackages.length} packages`)}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('המערכת בוחרת מספרים באקראי, מעדיפה מלאי גבוה וזמינות, ולא כוללת פריטים שהושהו.', 'Numbers are randomized with a preference for higher remaining stock; paused items are excluded.')}</p>
              </Section>

              <Section title={t('חבילות', 'Packages')} bodyClassName="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setSelectedIds(selectablePackages.length > 0 && selectablePackages.every((pkg) => selectedIds.includes(pkg.id)) ? [] : selectablePackages.map((pkg) => pkg.id))}>
                    {selectablePackages.length > 0 && selectablePackages.every((pkg) => selectedIds.includes(pkg.id)) ? t('ביטול בחירה', 'Clear selection') : t('בחירת כל החבילות', 'Select all packages')}
                  </Button>
                  <Button type="button" variant="destructive" disabled={!deletableSelectedPackages.length} onClick={() => setDeleteSelectionOpen(true)}>
                    <Trash2 className="h-4 w-4" />{t(`מחיקת ${deletableSelectedPackages.length} חבילות נבחרות`, `Delete ${deletableSelectedPackages.length} selected packages`)}
                  </Button>
                </div>
                {!batchPackages.length ? (
                  <EmptyState icon={Package} title={t('אין חבילות באצווה זו', 'No packages in this batch')} />
                ) : (
                  <div className="space-y-2">
                    {batchPackages.map((pkg) => (
                      <div key={pkg.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                        {selectablePackages.some((item) => item.id === pkg.id) && <Checkbox checked={selectedIds.includes(pkg.id)} onCheckedChange={() => togglePackage(pkg.id)} aria-label={t(`בחירת חבילה ${pkg.package_number}`, `Select package ${pkg.package_number}`)} />}
                        <div className="min-w-32 font-semibold">
                          <span className="block">{t('חבילה', 'Package')} #{pkg.package_number}</span>
                          <span className="block text-sm text-brand">{t('עיר', 'Town')}: {pkg.town || t('לא צוינה עיר', 'Town not set')}</span>
                        </div>
                        <div className="min-w-0 flex-1 text-sm text-muted-foreground">{pkg.items?.length ? packageBreakdown(pkg.items) : t('טרם הוגדרה תכולה', 'Contents not generated')}</div>
                        <span className="text-sm tabular-nums">{pkg.total_units || 0} {t('יח׳', 'units')}</span>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs">{t(pkg.status, pkg.status)}</span>
                        {['draft', 'ready'].includes(pkg.status) && <Button type="button" variant="ghost" size="icon" title={t('ביטול ושחרור מלאי', 'Cancel and release stock')} onClick={() => cancelPackage(pkg)}><CircleX className="h-4 w-4 text-muted-foreground" /></Button>}
                        <Button type="button" variant="ghost" size="icon" title={t('מחיקת חבילה', 'Delete package')} aria-label={t(`מחיקת חבילה ${pkg.package_number}`, `Delete package ${pkg.package_number}`)} onClick={() => setDeleteTarget(pkg)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              {!!selectedExportPackages.length && (
                <Section title={t(`ייצוא והדפסה (${selectedExportPackages.length})`, `Export and print (${selectedExportPackages.length})`)} description={t('הייצוא כולל רק חבילות מוכנות או שכבר סופקו מתוך הבחירה.', 'Exports include only built or delivered packages from your selection.')} bodyClassName="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => downloadCsv(selectedExportPackages, t)}><Download className="h-4 w-4" />CSV</Button>
                    <Button type="button" variant="outline" onClick={() => setPrintMode('list')}><Printer className="h-4 w-4" />{t('הדפסת רשימה', 'Print list')}</Button>
                    <Button type="button" variant="outline" onClick={() => setPrintMode('labels')}><Printer className="h-4 w-4" />{t('הדפסת מדבקות A4', 'Print A4 labels')}</Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/40 p-3">
                    <label className="flex items-center gap-2 text-sm">{t('שורות', 'Rows')}<Input type="number" min="1" max="20" step="1" value={labelRows} onChange={(event) => setLabelRows(event.target.value === '' ? '' : String(Math.max(1, Math.floor(Number(event.target.value) || 1))))} onBlur={() => updateLabels('label_rows', labelRows)} className="w-20" /></label>
                    <label className="flex items-center gap-2 text-sm">{t('עמודות', 'Columns')}<Input type="number" min="1" max="20" step="1" value={labelColumns} onChange={(event) => setLabelColumns(event.target.value === '' ? '' : String(Math.max(1, Math.floor(Number(event.target.value) || 1))))} onBlur={() => updateLabels('label_columns', labelColumns)} className="w-20" /></label>
                    <span className="text-xs text-muted-foreground">{t('הפריסה מחושבת אוטומטית על דף A4.', 'The label cells are calculated to fit an A4 sheet.')}</span>
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      )}
      {creating && <PackageBatchForm towns={model.towns} onClose={() => setCreating(false)} onCreate={createBatch} saving={saving} />}
      <Dialog open={!!printMode} onOpenChange={(open) => { if (!open) setPrintMode(null); }}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
          <DialogTitle>{printMode === 'labels' ? t('מדבקות חבילות', 'Package stickers') : t('רשימת חבילות', 'Package list')}</DialogTitle>
          <div className="flex justify-end"><Button type="button" onClick={() => window.print()}><Printer className="h-4 w-4" />{t('הדפסה', 'Print')}</Button></div>
          {activeBatch && printablePackages(selectedExportPackages, printMode, { ...activeBatch, label_rows: labelRows, label_columns: labelColumns }, t)}
        </DialogContent>
      </Dialog>
      {printMode && activeBatch && createPortal(
        printablePackages(selectedExportPackages, printMode, { ...activeBatch, label_rows: labelRows, label_columns: labelColumns }, t, true),
        document.body
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t(`למחוק את חבילה ${deleteTarget.package_number}?`, `Delete package ${deleteTarget.package_number}?`)}
          text={t('הפעולה אינה ניתנת לביטול. חבילות שכבר סופקו לא ניתנות למחיקה.', 'This cannot be undone. Packages that have already been delivered cannot be deleted.')}
          confirmLabel={t('מחיקת חבילה', 'Delete package')}
          busy={deleting}
          onConfirm={deletePackage}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {deleteSelectionOpen && (
        <ConfirmDialog
          title={t(`למחוק ${deletableSelectedPackages.length} חבילות נבחרות?`, `Delete ${deletableSelectedPackages.length} selected packages?`)}
          text={t('החבילות שסופקו לא יימחקו. ביטול הפעולה אינו אפשרי.', 'Delivered packages will be kept. This action cannot be undone.')}
          confirmLabel={t('מחיקת החבילות', 'Delete packages')}
          busy={deleting}
          onConfirm={deleteSelectedPackages}
          onClose={() => setDeleteSelectionOpen(false)}
        />
      )}
      {deleteBatchTarget && (
        <ConfirmDialog
          title={t(`למחוק את אצוות ${deleteBatchTarget.batch_date}?`, `Delete the batch from ${deleteBatchTarget.batch_date}?`)}
          text={t(
            `כל ${packages.filter((pkg) => pkg.batch_id === deleteBatchTarget.id).length} החבילות באצווה זו יימחקו וישוחרר מלאי ששמור בהן. אצווה עם חבילות שכבר סופקו לא ניתנת למחיקה.`,
            `All ${packages.filter((pkg) => pkg.batch_id === deleteBatchTarget.id).length} packages in this batch will be deleted and reserved stock released. A batch containing delivered packages cannot be deleted.`
          )}
          confirmLabel={t('מחיקת אצווה', 'Delete batch')}
          busy={deleting}
          onConfirm={deleteBatch}
          onClose={() => setDeleteBatchTarget(null)}
        />
      )}
      <style>{`
        .package-print-root { background: white; color: black; }
        .package-print-preview { width: 210mm; min-height: 297mm; margin: auto; box-shadow: 0 1px 8px #0002; }
        .package-list-print { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 12mm; }
        .package-list-cards { display: grid; gap: 5mm; }
        .package-list-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #999; border-radius: 2mm; padding: 4mm; }
        .package-list-card-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2mm 7mm; border-bottom: 1px solid #bbb; padding-bottom: 2mm; }
        .package-list-card-header h2 { margin: 0; font-size: 14pt; }
        .package-list-card-header span { font-weight: 700; }
        .package-list-card-header b { margin-inline-start: auto; }
        .package-quantity-groups { display: grid; gap: 2mm; padding-top: 3mm; }
        .package-quantity-group { display: grid; grid-template-columns: minmax(30mm, auto) 1fr; gap: 2mm 4mm; align-items: start; border: 1px solid #ddd; border-radius: 1mm; padding: 2mm; }
        .package-quantity-serials { overflow-wrap: anywhere; }
        .package-label-sheet { box-sizing: border-box; display: grid; width: 210mm; height: 297mm; padding: 8mm; page-break-after: always; break-after: page; }
        .package-label-sheet:last-child { page-break-after: auto; break-after: auto; }
        .package-label { box-sizing: border-box; overflow: hidden; border: 1px dashed #777; padding: 3mm; font-size: 9pt; }
        .package-label-number { margin: 0 0 1mm; font-weight: 700; font-size: 12pt; }
        .package-label-town { margin: 0 0 1mm; font-weight: 700; font-size: 11pt; }
        .package-quantity-groups-compact { gap: 1mm; padding-top: 1mm; font-size: 7pt; }
        .package-quantity-groups-compact .package-quantity-group { display: block; border: 0; border-top: 1px solid #ddd; border-radius: 0; padding: 1mm 0 0; }
        .package-quantity-groups-compact .package-quantity-serials { display: block; line-height: 1.2; }
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          #root { display: none !important; }
          body > [data-package-print-output],
          body > [data-package-print-output] * { visibility: visible !important; }
          body > [data-package-print-output] { display: block !important; position: static !important; width: 210mm !important; margin: 0 !important; overflow: visible !important; background: white !important; color: black !important; box-shadow: none !important; }
          .package-list-print { width: 210mm; min-height: 297mm; }
          .package-label-sheet { width: 210mm; height: 297mm; }
          .package-print-preview { display: none !important; }
        }
      `}</style>
    </>
  );
}
