// Wholesale price tiers and print-order pricing. Pure functions.
import { num, round2, round4 } from './format';

// A tier is "a batch of N notepads for X ILS" -> the price per unit is X / N.
export const tierUnitPrice = (tier) =>
  num(tier?.batch_size) > 0 ? num(tier.batch_price) / num(tier.batch_size) : 0;

export const sortTiers = (tiers = []) => [...tiers].sort((a, b) => num(a.batch_size) - num(b.batch_size));

// The tier with the largest batch size that does not exceed the quantity.
// Below the smallest tier the smallest tier's price is used as the base price.
export function pickTier(tiers, units) {
  const sorted = sortTiers(tiers);
  if (!sorted.length || num(units) <= 0) return null;
  let chosen = sorted[0];
  for (const t of sorted) if (num(t.batch_size) <= num(units)) chosen = t;
  return chosen;
}

// manualUnitPrice: '' / null / undefined means "use the tier price".
export function priceDelivery(tiers, units, manualUnitPrice) {
  const hasManual =
    manualUnitPrice !== '' && manualUnitPrice !== null && manualUnitPrice !== undefined &&
    Number.isFinite(Number(manualUnitPrice)) && Number(manualUnitPrice) >= 0;
  const tier = pickTier(tiers, units);
  let unit = 0;
  let source = 'none';
  if (hasManual) {
    unit = Number(manualUnitPrice);
    source = 'manual';
  } else if (tier) {
    unit = tierUnitPrice(tier);
    source = 'tier';
  }
  return { tier, source, unit_price: round4(unit), total_value: round2(unit * num(units)) };
}

// Print order: the owner types either the total or the unit price; the other one follows the copy count.
export function derivePrinting({ mode, value, copies }) {
  const v = num(value);
  const c = num(copies);
  if (mode === 'unit') return { total: round2(v * c), unit: round4(v) };
  return { total: round2(v), unit: c > 0 ? round4(v / c) : 0 };
}

// A sales report: an explicit unit price wins, otherwise the store's default price is used.
export function priceSale(defaultUnit, units, manualUnitPrice) {
  const hasManual =
    manualUnitPrice !== '' && manualUnitPrice !== null && manualUnitPrice !== undefined &&
    Number.isFinite(Number(manualUnitPrice)) && Number(manualUnitPrice) >= 0;
  const unit = hasManual ? Number(manualUnitPrice) : num(defaultUnit);
  return { unit_price: round4(unit), total_value: round2(unit * num(units)), source: hasManual ? 'manual' : 'default' };
}