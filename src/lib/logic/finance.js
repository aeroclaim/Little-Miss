// Money owed by each store. Pure functions.
//   balance = invoiced deliveries + reported sales (consignment) - return credits - payments received
import { num, round2, round4, sumQty } from './format';

export function computeStoreFinance({ stores = [], deliveries = [], sales = [], returns = [], payments = [] }) {
  const fin = {};
  const f = (id) => {
    if (!fin[id]) {
      fin[id] = {
        invoiced: 0, invoicedUnits: 0, consignmentValue: 0, consignmentUnits: 0, deliveredValue: 0, deliveredUnits: 0,
        salesValue: 0, soldUnits: 0, credits: 0, paid: 0, paymentCount: 0, lastPayment: null,
      };
    }
    return fin[id];
  };
  for (const s of stores) f(s.id);

  for (const d of deliveries) {
    const x = f(d.store_id);
    const units = num(d.total_units) || sumQty(d.items);
    const value = num(d.total_value);
    x.deliveredUnits += units;
    x.deliveredValue += value;
    if (d.payment_model === 'invoice') {
      x.invoiced += value;
      x.invoicedUnits += units;
    } else {
      x.consignmentValue += value;
      x.consignmentUnits += units;
    }
  }
  for (const s of sales) {
    const x = f(s.store_id);
    x.salesValue += num(s.total_value);
    x.soldUnits += num(s.total_units) || sumQty(s.items);
  }
  for (const r of returns) f(r.store_id).credits += num(r.credit_value);
  for (const p of payments) {
    const x = f(p.store_id);
    x.paid += num(p.amount);
    x.paymentCount += 1;
    if (!x.lastPayment || p.payment_date > x.lastPayment) x.lastPayment = p.payment_date;
  }
  for (const x of Object.values(fin)) {
    x.charges = round2(x.invoiced + x.salesValue);
    x.balance = round2(x.charges - x.credits - x.paid);
    x.avgUnitPrice = x.deliveredUnits > 0 ? round4(x.deliveredValue / x.deliveredUnits) : 0;
    x.invoiceUnitPrice = x.invoicedUnits > 0 ? round4(x.invoiced / x.invoicedUnits) : x.avgUnitPrice;
    // Default price of a consignment sale: what the store's consignment deliveries were priced at.
    x.consignmentUnitPrice = x.consignmentUnits > 0 ? round4(x.consignmentValue / x.consignmentUnits) : x.avgUnitPrice;
  }
  return fin;
}

// Chronological history of one store with a running balance.
export function buildLedger(storeId, { deliveries = [], sales = [], returns = [], payments = [] }) {
  const rows = [];
  for (const d of deliveries) {
    if (d.store_id !== storeId) continue;
    rows.push({
      id: d.id, kind: 'delivery', date: d.delivery_date, created: d.created_date, units: num(d.total_units) || sumQty(d.items),
      charge: d.payment_model === 'invoice' ? num(d.total_value) : 0, credit: 0,
      model: d.payment_model, info: num(d.total_value), record: d,
    });
  }
  for (const s of sales) {
    if (s.store_id !== storeId) continue;
    rows.push({
      id: s.id, kind: 'sale', date: s.sale_date, created: s.created_date, units: num(s.total_units) || sumQty(s.items),
      charge: num(s.total_value), credit: 0, record: s,
    });
  }
  for (const r of returns) {
    if (r.store_id !== storeId) continue;
    rows.push({
      id: r.id, kind: 'return', date: r.return_date, created: r.created_date, units: num(r.total_units) || sumQty(r.items),
      charge: 0, credit: num(r.credit_value), record: r,
    });
  }
  for (const p of payments) {
    if (p.store_id !== storeId) continue;
    rows.push({
      id: p.id, kind: 'payment', date: p.payment_date, created: p.created_date, units: 0,
      charge: 0, credit: num(p.amount), record: p,
    });
  }
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.created).localeCompare(String(b.created)));
  let balance = 0;
  for (const r of rows) {
    balance = round2(balance + r.charge - r.credit);
    r.balance = balance;
  }
  return rows;
}