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
    let before = data;
    const packageIds = record.package_ids || (record.package_id ? [record.package_id] : []);
    if (table === 'deliveries' && packageIds.length) {
      before = {
        ...data,
        packages: (data.packages || []).map((pkg) => packageIds.includes(pkg.id) ? { ...pkg, status: 'delivered' } : pkg),
      };
    }
    const next = simulate(before, table, op, record);
    const bad = newViolations(findViolations(data), findViolations(next));
    return bad.length ? { ok: false, violations: bad } : null;
  };

  async function save(table, values, id) {
    const recordValues = table === 'stores' ? { ...values, town: await ensureTown(values.town) } : values;
    const op = id ? 'update' : 'create';
    if (table === 'deliveries') {
      const originalDelivery = id ? data.deliveries.find((delivery) => delivery.id === id) : null;
      const originalQuantities = Object.fromEntries(
        (originalDelivery?.items || []).map((item) => [Number(item.serial_number), Number(item.quantity) || 0])
      );
      const blockedSerials = (recordValues.items || [])
        .filter((item) => Number(item.quantity) > (originalQuantities[Number(item.serial_number)] || 0))
        .map((item) => Number(item.serial_number))
        .filter((serial) => data.products.find((product) => Number(product.serial_number) === serial)?.not_for_sale);
      if (blockedSerials.length) {
        return {
          ok: false,
          message: t(
            `לא ניתן לספק מספרים שחסומים לאספקה: ${[...new Set(blockedSerials)].join(', ')}.`,
            `Items blocked from new deliveries cannot be supplied: ${[...new Set(blockedSerials)].join(', ')}.`
          ),
        };
      }
    }
    const problem = blocked(table, op, id ? { ...recordValues, id } : recordValues);
    if (problem) return problem;
    const saved = id ? await dataLayer.update(table, id, recordValues) : await dataLayer.create(table, recordValues);
    patchCache(table, op, { ...recordValues, ...saved, id: saved?.id || id });
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
      [...serials].some((s) => stock[s] && (stock[s].printed || stock[s].delivered || stock[s].returned || stock[s].sold || stock[s].reserved)) ||
      (data.packages || []).some((pkg) => (pkg.items || []).some((item) => serials.has(item.serial_number)) && pkg.status !== 'cancelled') ||
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
    if (values.not_for_sale === true && !existing?.not_for_sale) {
      const reserved = (data.packages || []).filter((pkg) =>
        pkg.status === 'ready' && (pkg.items || []).some((item) => Number(item.serial_number) === Number(serial))
      );
      if (reserved.length) {
        return {
          ok: false,
          message: t(
            `לא ניתן לחסום את מספר ${serial} כל עוד הוא שמור בחבילות מוכנות: ${reserved.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')}.`,
            `Number ${serial} cannot be blocked while reserved in ready packages: ${reserved.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')}.`
          ),
        };
      }
    }
    return save('products', { ...values, serial_number: serial }, existing?.id);
  }

  async function bulkConfigureProducts(serials, changes) {
    const selected = new Set(serials.map(Number));
    if (!selected.size) return { ok: false, message: t('יש לבחור מספרים תחילה.', 'Select items first.') };
    if (changes.not_for_sale === true) {
      const conflicts = (data.packages || []).filter((pkg) =>
        pkg.status === 'ready' && (pkg.items || []).some((item) => selected.has(Number(item.serial_number)))
      );
      if (conflicts.length) {
        return {
          ok: false,
          message: t(
            `לא ניתן לסמן פריטים כחסומים למכירה כל עוד הם שמורים בחבילות מוכנות: ${conflicts.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')}. בטלו או בנו מחדש את החבילות.`,
            `These items cannot be blocked while reserved in ready packages: ${conflicts.map((pkg) => `#${pkg.package_number} (${pkg.town})`).join(', ')}. Cancel or rebuild those packages first.`
          ),
        };
      }
    }

    const productChanges = Object.fromEntries(
      ['not_for_sale', 'distribution_paused'].filter((key) => changes[key] !== undefined).map((key) => [key, changes[key]])
    );
    try {
      if (Object.keys(productChanges).length) {
        for (const serial of selected) {
          const existing = data.products.find((product) => Number(product.serial_number) === serial);
          if (existing) await dataLayer.update('products', existing.id, productChanges);
          else await dataLayer.create('products', { serial_number: serial, ...productChanges });
        }
      }

      if (changes.townAction && changes.townNames?.length) {
        const townNames = new Set(changes.townNames.map((name) => String(name).trim().toLocaleLowerCase()));
        for (const town of data.towns || []) {
          if (!townNames.has(String(town.name || '').trim().toLocaleLowerCase())) continue;
          const current = new Set((town.assigned_serials || []).map(Number));
          for (const serial of selected) {
            if (changes.townAction === 'assign') current.add(serial);
            else current.delete(serial);
          }
          await dataLayer.update('towns', town.id, { assigned_serials: [...current].sort((a, b) => a - b) });
        }
      }
      await refetchAll();
      return { ok: true };
    } catch (error) {
      await refetchAll();
      return {
        ok: false,
        message: t(
          `העדכון נעצר לאחר שגיאה: ${error.message}. ייתכן שחלק מהשינויים כבר נשמרו; הרשומות נטענו מחדש.`,
          `The update stopped after an error: ${error.message}. Some changes may already have been saved; records have been reloaded.`
        ),
      };
    }
  }

  async function ensureTown(value) {
    const name = String(value || '').trim();
    if (!name) return name;
    const existing = (data.towns || []).find((town) => town.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) return existing.name;
    const created = await dataLayer.create('towns', { name, assigned_serials: [], notes: '' });
    await refetchAll();
    return created.name;
  }

  async function saveTown(name, values) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return { ok: false, message: t('יש להזין שם עיר.', 'Enter a town name.') };
    const duplicate = (data.towns || []).find((town) => town.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
    const serials = [...new Set((values.assigned_serials || []).map(Number).filter((serial) => Number.isInteger(serial) && serial > 0))].sort((a, b) => a - b);
    const payload = { name: duplicate?.name || normalizedName, notes: String(values.notes || ''), assigned_serials: serials };
    const saved = duplicate
      ? await dataLayer.update('towns', duplicate.id, payload)
      : await dataLayer.create('towns', payload);
    patchCache('towns', duplicate ? 'update' : 'create', { ...payload, ...saved, id: saved?.id || duplicate?.id });
    await refetchAll();
    return { ok: true, record: saved };
  }

  async function issuePackages(packageIds, values) {
    const uniqueIds = [...new Set(packageIds)];
    const selectedPackages = uniqueIds.map((id) => (data.packages || []).find((item) => item.id === id));
    if (!uniqueIds.length || selectedPackages.some((pkg) => !pkg || pkg.status !== 'ready')) {
      return { ok: false, message: t('אחת או יותר מהחבילות אינן מוכנות לאספקה.', 'One or more selected packages are not ready for delivery.') };
    }
    const blockedSerials = (values.items || [])
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => Number(item.serial_number))
      .filter((serial) => data.products.find((product) => Number(product.serial_number) === serial)?.not_for_sale);
    if (blockedSerials.length) {
      return {
        ok: false,
        message: t(
          `האספקה כוללת מספרים החסומים לאספקה: ${[...new Set(blockedSerials)].join(', ')}.`,
          `The supply contains items blocked from delivery: ${[...new Set(blockedSerials)].join(', ')}.`
        ),
      };
    }
    const result = await save('deliveries', {
      ...values,
      package_ids: uniqueIds,
      package_id: uniqueIds.length === 1 ? uniqueIds[0] : undefined,
      reference: values.reference || selectedPackages.map((pkg) => `#${pkg.package_number}`).join(', '),
    });
    if (!result.ok) return result;
    try {
      for (const pkg of selectedPackages) {
        await dataLayer.update('packages', pkg.id, {
          status: 'delivered',
          store_id: values.store_id,
          delivery_id: result.record?.id,
        });
      }
    } catch (error) {
      await refetchAll();
      return {
        ok: false,
        message: t(
          `האספקה נשמרה, אך עדכון מצב אחת החבילות נכשל: ${error.message}`,
          `The delivery was saved, but updating one of the package statuses failed: ${error.message}`
        ),
      };
    }
    await refetchAll();
    return { ok: true, record: result.record };
  }

  const issuePackage = (packageId, values) => issuePackages([packageId], values);

  return { save, remove, saveCollection, removeCollection, saveProduct, bulkConfigureProducts, saveTown, issuePackage, issuePackages };
}