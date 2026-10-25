import { useQueryClient } from '@tanstack/react-query';
import { dataLayer } from '@/data/dataLayer';
import { useAppData, QUERY_KEY } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { simulate, findViolations, newViolations } from '@/lib/logic/integrity';
import { validateCollectionRange, missingProductSerials, rangeSerials } from '@/lib/logic/serials';
import { computeStock } from '@/lib/logic/inventory';

// Tables whose records move stock around. Every change is simulated first and rejected if it would
// leave a negative quantity somewhere (warehouse or a store's shelf).
const GUARDED = ['printOrders', 'deliveries', 'returns', 'sales'];
const STORE_TABLES = ['deliveries', 'sales', 'returns', 'payments', 'preorders'];

export function useActions() {
  const qc = useQueryClient();
  const { data } = useAppData();
  const { t } = useLang();

  const patchCache = (table, op, record) =>
    qc.setQueryData(QUERY_KEY, (d) => (d ? simulate(d, table, op, record) : d));
  const refetchAll = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const blocked = (table, op, record) => {
    if (!GUARDED.includes(table)) return null;
    const next = simulate(data, table, op, record);
    const bad = newViolations(findViolations(data), findViolations(next));
    return bad.length ? { ok: false, violations: bad } : null;
  };

  async function save(table, values, id) {
    const op = id ? 'update' : 'create';
    const problem = blocked(table, op, id ? { ...values, id } : values);
    if (problem) return problem;
    const saved = id ? await dataLayer.update(table, id, values) : await dataLayer.create(table, values);
    patchCache(table, op, { ...values, ...saved, id: saved?.id || id });
    return { ok: true, record: saved };
  }

  async function remove(table, id) {
    const problem = blocked(table, 'delete', { id });
    if (problem) return problem;
    if (table === 'stores' && STORE_TABLES.some((k) => (data[k] || []).some((r) => r.store_id === id))) {
      return {
        ok: false,
        message: t(
          'לחנות יש היסטוריה (אספקות, תשלומים וכו׳) ולכן אי אפשר למחוק אותה. אפשר לסמן אותה כלא פעילה.',
          'This store has history, so it cannot be deleted. Mark it as inactive instead.'
        ),
      };
    }
    await dataLayer.remove(table, id);
    patchCache(table, 'delete', { id });
    return { ok: true };
  }

  // A collection owns a consecutive range of serial numbers; its product entries are created automatically.
  async function saveCollection(values, id) {
    const problem = validateCollectionRange(values, data.collections, id);
    if (problem) {
      const w = problem.with;
      return {
        ok: false,
        message:
          problem.code === 'overlap'
            ? t(`הטווח חופף לאוסף "${w.name}" (${w.serial_from}-${w.serial_to})`, `The range overlaps "${w.name_en || w.name}" (${w.serial_from}-${w.serial_to})`)
            : t('טווח המספרים אינו תקין', 'Invalid number range'),
      };
    }
    const payload = { ...values, serial_from: Number(values.serial_from), serial_to: Number(values.serial_to) };
    const saved = id ? await dataLayer.update('collections', id, payload) : await dataLayer.create('collections', payload);
    const merged = { ...payload, ...saved, id: saved?.id || id };
    const missing = missingProductSerials([merged], data.products);
    if (missing.length) await dataLayer.bulkCreate('products', missing.map((serial_number) => ({ serial_number })));
    await refetchAll();
    return { ok: true, created: missing.length };
  }

  async function removeCollection(id) {
    const c = data.collections.find((x) => x.id === id);
    if (!c) return { ok: true };
    const serials = new Set(rangeSerials(c.serial_from, c.serial_to));
    const stock = computeStock({ ...data, preorders: [] });
    const used =
      [...serials].some((s) => stock[s] && (stock[s].printed || stock[s].delivered || stock[s].returned || stock[s].sold)) ||
      (data.preorders || []).some((p) => (p.items || []).some((it) => serials.has(it.serial_number)));
    if (used) {
      return {
        ok: false,
        message: t('לאוסף יש פעילות (הדפסות, אספקות וכו׳) ולכן אי אפשר למחוק אותו.', 'This collection has activity (prints, deliveries...), so it cannot be deleted.'),
      };
    }
    await Promise.all(data.products.filter((p) => serials.has(p.serial_number)).map((p) => dataLayer.remove('products', p.id)));
    await dataLayer.remove('collections', id);
    await refetchAll();
    return { ok: true };
  }

  async function saveProduct(serial, values) {
    const existing = data.products.find((p) => p.serial_number === serial);
    return save('products', { ...values, serial_number: serial }, existing?.id);
  }

  return { save, remove, saveCollection, removeCollection, saveProduct };
}