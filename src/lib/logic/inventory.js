// Stock and distribution maths. Pure functions over plain arrays of records.
import { num } from './format';

export const ZERO_STOCK = Object.freeze({
  printed: 0, delivered: 0, returned: 0, faulty: 0, sold: 0, preordered: 0,
  returnedOk: 0, available: 0, inMarket: 0, inStores: 0,
});

// Per serial number:
//   available = printed - delivered + returned (non faulty)   -> sellable stock in the warehouse
//   inMarket  = delivered - returned                          -> copies out in stores' towns (used for rarity)
//   inStores  = delivered - returned - reported sold          -> copies physically still on store shelves
export function computeStock({ printOrders = [], deliveries = [], returns = [], sales = [], preorders = [] }) {
  const rows = {};
  const row = (serial) => {
    if (!rows[serial]) rows[serial] = { printed: 0, delivered: 0, returned: 0, faulty: 0, sold: 0, preordered: 0 };
    return rows[serial];
  };
  for (const o of printOrders) for (const it of o.items || []) row(it.serial_number).printed += num(it.quantity);
  for (const d of deliveries) for (const it of d.items || []) row(it.serial_number).delivered += num(it.quantity);
  for (const r of returns) {
    for (const it of r.items || []) {
      const x = row(it.serial_number);
      x.returned += num(it.quantity);
      x.faulty += num(it.faulty_quantity);
    }
  }
  for (const s of sales) for (const it of s.items || []) row(it.serial_number).sold += num(it.quantity);
  for (const p of preorders) {
    if (p.status === 'open') for (const it of p.items || []) row(it.serial_number).preordered += num(it.quantity);
  }
  for (const x of Object.values(rows)) {
    x.returnedOk = x.returned - x.faulty;
    x.available = x.printed - x.delivered + x.returnedOk;
    x.inMarket = x.delivered - x.returned;
    x.inStores = x.delivered - x.returned - x.sold;
  }
  return rows;
}

// Per store, and per serial inside each store.
export function computeStoreStats({ deliveries = [], returns = [], sales = [] }) {
  const stores = {};
  const ensure = (id) => {
    if (!stores[id]) {
      stores[id] = {
        delivered: 0, returned: 0, faulty: 0, sold: 0, inStore: 0,
        deliveryCount: 0, returnCount: 0, saleCount: 0,
        lastDelivery: null, lastReturn: null, serials: {},
      };
    }
    return stores[id];
  };
  const ser = (st, serial) => {
    if (!st.serials[serial]) st.serials[serial] = { delivered: 0, returned: 0, faulty: 0, sold: 0, inStore: 0 };
    return st.serials[serial];
  };

  for (const d of deliveries) {
    const st = ensure(d.store_id);
    st.deliveryCount += 1;
    if (!st.lastDelivery || d.delivery_date > st.lastDelivery) st.lastDelivery = d.delivery_date;
    for (const it of d.items || []) {
      const q = num(it.quantity);
      ser(st, it.serial_number).delivered += q;
      st.delivered += q;
    }
  }
  for (const r of returns) {
    const st = ensure(r.store_id);
    st.returnCount += 1;
    if (!st.lastReturn || r.return_date > st.lastReturn) st.lastReturn = r.return_date;
    for (const it of r.items || []) {
      const q = num(it.quantity);
      const f = num(it.faulty_quantity);
      const s = ser(st, it.serial_number);
      s.returned += q;
      s.faulty += f;
      st.returned += q;
      st.faulty += f;
    }
  }
  for (const sale of sales) {
    const st = ensure(sale.store_id);
    st.saleCount += 1;
    for (const it of sale.items || []) {
      const q = num(it.quantity);
      ser(st, it.serial_number).sold += q;
      st.sold += q;
    }
  }
  for (const st of Object.values(stores)) {
    st.inStore = 0;
    for (const r of Object.values(st.serials)) {
      r.inStore = r.delivered - r.returned - r.sold;
      st.inStore += r.inStore;
    }
  }
  return stores;
}

// Quantities currently on a store's shelves, as { serial: qty } (only positive values).
export function storeShelf(storeStatsRow) {
  const out = {};
  if (!storeStatsRow) return out;
  for (const [serial, r] of Object.entries(storeStatsRow.serials)) if (r.inStore > 0) out[serial] = r.inStore;
  return out;
}

// What a store may still report as sold / return: its shelf plus what the edited record already holds.
export function shelfLimits(storeStatsRow, original = {}) {
  const out = storeShelf(storeStatsRow);
  for (const [serial, q] of Object.entries(original)) out[serial] = (out[serial] || 0) + (Number(q) || 0);
  return out;
}