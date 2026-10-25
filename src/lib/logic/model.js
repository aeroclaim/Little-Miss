// Turns the raw tables into everything the screens need, in one pass. Pure function.
import { indexBy } from './format';
import { buildCatalog, sortCollections, toneOf } from './serials';
import { computeStock, computeStoreStats } from './inventory';
import { computeStoreFinance } from './finance';
import { computeTownStats, computeTotals } from './analytics';
import { rarityTable } from './rarity';

export function buildModel(data) {
  const collections = sortCollections(data.collections);
  const catalog = buildCatalog(collections, data.products);
  const stock = computeStock(data);
  const storeStats = computeStoreStats(data);
  const finance = computeStoreFinance(data);
  const storeById = indexBy(data.stores);

  const collectionBySerial = {};
  const toneBySerial = {};
  const entryBySerial = {};
  for (const entry of catalog) {
    collectionBySerial[entry.serial] = entry.collection;
    toneBySerial[entry.serial] = toneOf(entry.collection, collections);
    entryBySerial[entry.serial] = entry;
  }

  // Rarity only judges numbers that were actually printed.
  const printedSerials = catalog.filter((c) => (stock[c.serial]?.printed || 0) > 0).map((c) => c.serial);
  const marketCounts = {};
  for (const [serial, r] of Object.entries(stock)) marketCounts[serial] = r.inMarket;

  const towns = computeTownStats({ stores: data.stores, storeStats, finance }).map((t) => {
    const covered = printedSerials.filter((s) => (t.market[s] || 0) > 0).length;
    return { ...t, id: t.town, coverage: printedSerials.length ? covered / printedSerials.length : 0, coveredCount: covered };
  });
  const rarity = { overall: rarityTable(marketCounts, printedSerials), byTown: {} };
  for (const t of towns) rarity.byTown[t.town] = rarityTable(t.market, printedSerials);

  const openPreorderUnits = {};
  for (const p of data.preorders || []) {
    if (p.status !== 'open' || !p.store_id) continue;
    openPreorderUnits[p.store_id] = (openPreorderUnits[p.store_id] || 0) + (Number(p.total_units) || 0);
  }

  return {
    collections,
    catalog,
    stock,
    storeStats,
    finance,
    storeById,
    collectionBySerial,
    toneBySerial,
    entryBySerial,
    printedSerials,
    towns,
    rarity,
    openPreorderUnits,
    totals: computeTotals({ stock, finance, printOrders: data.printOrders }),
  };
}