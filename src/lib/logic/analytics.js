// Summaries by town, returns analysis, preorder demand, grand totals. Pure functions.
import { num, round2 } from './format';

export const UNKNOWN_TOWN = '—';
export const townOf = (store) => (store && String(store.town || '').trim()) || UNKNOWN_TOWN;

export function computeTownStats({ stores = [], towns: savedTowns = [], storeStats = {}, finance = {} }) {
  const towns = {};
  for (const town of savedTowns) {
    const name = String(town.name || '').trim();
    if (name && !towns[name]) {
      towns[name] = {
        town: name, storeIds: [], storeCount: 0,
        delivered: 0, returned: 0, faulty: 0, sold: 0, inStore: 0, deliveryCount: 0, returnCount: 0,
        charges: 0, credits: 0, paid: 0, balance: 0, market: {},
      };
    }
  }
  for (const store of stores) {
    const name = townOf(store);
    if (!towns[name]) {
      towns[name] = {
        town: name, storeIds: [], storeCount: 0,
        delivered: 0, returned: 0, faulty: 0, sold: 0, inStore: 0, deliveryCount: 0, returnCount: 0,
        charges: 0, credits: 0, paid: 0, balance: 0, market: {},
      };
    }
    const t = towns[name];
    t.storeIds.push(store.id);
    t.storeCount += 1;
    const s = storeStats[store.id];
    if (s) {
      t.delivered += s.delivered;
      t.returned += s.returned;
      t.faulty += s.faulty;
      t.sold += s.sold;
      t.inStore += s.inStore;
      t.deliveryCount += s.deliveryCount;
      t.returnCount += s.returnCount;
      for (const [serial, r] of Object.entries(s.serials)) {
        t.market[serial] = (t.market[serial] || 0) + r.delivered - r.returned;
      }
    }
    const f = finance[store.id];
    if (f) {
      t.charges += f.charges;
      t.credits += f.credits;
      t.paid += f.paid;
      t.balance += f.balance;
    }
  }
  return Object.values(towns)
    .map((t) => ({ ...t, balance: round2(t.balance), inMarket: t.delivered - t.returned, returnRate: t.delivered > 0 ? t.returned / t.delivered : 0 }))
    .sort((a, b) => a.town.localeCompare(b.town, 'he'));
}

// Return frequency per store and which numbers come back most.
export function analyzeReturns({ stores = [], storeStats = {}, stock = {}, serials = [] }) {
  const returningStores = {};
  for (const st of Object.values(storeStats)) {
    for (const [serial, r] of Object.entries(st.serials)) {
      if (r.returned > 0) returningStores[serial] = (returningStores[serial] || 0) + 1;
    }
  }
  const byStore = stores
    .map((store) => {
      const st = storeStats[store.id] || {};
      const delivered = st.delivered || 0;
      const returned = st.returned || 0;
      return {
        id: store.id, store, delivered, returned, faulty: st.faulty || 0,
        deliveryCount: st.deliveryCount || 0, returnCount: st.returnCount || 0,
        rate: delivered > 0 ? returned / delivered : 0,
        frequency: st.deliveryCount > 0 ? (st.returnCount || 0) / st.deliveryCount : 0,
        lastReturn: st.lastReturn || null,
      };
    })
    .filter((r) => r.delivered > 0 || r.returned > 0);
  const bySerial = serials
    .map((serial) => {
      const s = stock[serial] || {};
      const delivered = s.delivered || 0;
      const returned = s.returned || 0;
      return {
        id: serial, serial, delivered, returned, faulty: s.faulty || 0,
        rate: delivered > 0 ? returned / delivered : 0,
        storesReturning: returningStores[serial] || 0,
      };
    })
    .filter((r) => r.delivered > 0 || r.returned > 0);
  return { byStore, bySerial };
}

// Preorder demand per town and per serial number (cancelled preorders never count).
export function analyzeDemand({ preorders = [], storeById = {}, stock = {}, openOnly = true }) {
  const byTown = {};
  const bySerial = {};
  const totals = { orders: 0, units: 0, general: 0, specific: 0 };
  for (const p of preorders) {
    if (p.status === 'cancelled') continue;
    if (openOnly && p.status === 'fulfilled') continue;
    const town = (p.store_id && storeById[p.store_id] ? townOf(storeById[p.store_id]) : String(p.town || '').trim()) || UNKNOWN_TOWN;
    const t = byTown[town] || (byTown[town] = { id: town, town, orders: 0, general: 0, specific: 0, units: 0 });
    const general = num(p.general_quantity);
    t.orders += 1;
    t.general += general;
    totals.orders += 1;
    totals.general += general;
    for (const it of p.items || []) {
      const q = num(it.quantity);
      t.specific += q;
      totals.specific += q;
      const s = bySerial[it.serial_number] || (bySerial[it.serial_number] = { id: it.serial_number, serial: it.serial_number, units: 0, towns: {} });
      s.units += q;
      s.towns[town] = (s.towns[town] || 0) + q;
    }
    t.units = t.general + t.specific;
  }
  totals.units = totals.general + totals.specific;
  const serialRows = Object.values(bySerial).map((s) => {
    const available = stock[s.serial]?.available || 0;
    const topTown = Object.entries(s.towns).sort((a, b) => b[1] - a[1])[0];
    return { ...s, available, gap: Math.max(0, s.units - available), topTown: topTown ? topTown[0] : null };
  });
  return { byTown: Object.values(byTown), bySerial: serialRows, totals };
}

export function computeTotals({ stock = {}, finance = {}, printOrders = [], expenses = [] }) {
  const t = { printed: 0, delivered: 0, returned: 0, faulty: 0, sold: 0, available: 0, inStores: 0, inMarket: 0 };
  for (const r of Object.values(stock)) {
    t.printed += r.printed;
    t.delivered += r.delivered;
    t.returned += r.returned;
    t.faulty += r.faulty;
    t.sold += r.sold;
    t.available += r.available;
    t.inStores += r.inStores;
    t.inMarket += r.inMarket;
  }
  t.printCost = round2(printOrders.reduce((s, o) => s + num(o.total_price), 0));
  t.miscExpense = round2(expenses.reduce((sum, expense) => sum + num(expense.amount), 0));
  t.totalExpenses = round2(t.printCost + t.miscExpense);
  t.charged = 0;
  t.credits = 0;
  t.paid = 0;
  t.receivable = 0;
  for (const f of Object.values(finance)) {
    t.charged += f.charges;
    t.credits += f.credits;
    t.paid += f.paid;
    if (f.balance > 0) t.receivable += f.balance;
  }
  t.charged = round2(t.charged);
  t.credits = round2(t.credits);
  t.paid = round2(t.paid);
  t.receivable = round2(t.receivable);
  t.returnRate = t.delivered > 0 ? t.returned / t.delivered : 0;
  t.afterTrackedExpenses = round2(t.charged - t.totalExpenses);
  return t;
}