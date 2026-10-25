// Guards the books: no mutation may leave a negative warehouse stock or a negative shelf quantity.
// Every create / edit / delete is simulated first, then checked with findViolations.
import { computeStock, computeStoreStats } from './inventory';

export function simulate(data, table, op, record) {
  const list = data[table] || [];
  let next;
  if (op === 'delete') next = list.filter((r) => r.id !== record.id);
  else if (op === 'update') next = list.map((r) => (r.id === record.id ? { ...r, ...record } : r));
  else next = [...list, { ...record, id: record.id || '__new__' }];
  return { ...data, [table]: next };
}

export function excludeRecord(data, table, id) {
  if (!id) return data;
  return { ...data, [table]: (data[table] || []).filter((r) => r.id !== id) };
}

export function findViolations(data) {
  const out = [];
  const stock = computeStock({ ...data, preorders: [] });
  for (const [serial, r] of Object.entries(stock)) {
    if (r.available < 0) out.push({ type: 'stock', serial: Number(serial), shortage: -r.available });
  }
  const stats = computeStoreStats(data);
  for (const [storeId, st] of Object.entries(stats)) {
    for (const [serial, r] of Object.entries(st.serials)) {
      if (r.inStore < 0) out.push({ type: 'store', storeId, serial: Number(serial), shortage: -r.inStore });
    }
  }
  for (const rt of data.returns || []) {
    for (const it of rt.items || []) {
      if ((Number(it.faulty_quantity) || 0) > (Number(it.quantity) || 0)) {
        out.push({ type: 'faulty', serial: it.serial_number, shortage: (Number(it.faulty_quantity) || 0) - (Number(it.quantity) || 0) });
      }
    }
  }
  return out;
}

const keyOf = (v) => `${v.type}|${v.storeId || ''}|${v.serial || ''}`;

// Only violations that are new, or worse than before, block an action.
export function newViolations(before, after) {
  const prior = new Map(before.map((v) => [keyOf(v), v.shortage]));
  return after.filter((v) => !prior.has(keyOf(v)) || v.shortage > prior.get(keyOf(v)));
}