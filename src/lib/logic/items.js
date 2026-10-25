// Helpers for the [{ serial_number, quantity }] lists stored on deliveries, returns, print orders, etc.

export function itemsToMap(items, field = 'quantity') {
  const out = {};
  for (const it of items || []) out[it.serial_number] = (out[it.serial_number] || 0) + (Number(it[field]) || 0);
  return out;
}

export const mapTotal = (map) => Object.values(map || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const mapCount = (map) => Object.values(map || {}).filter((v) => Number(v) > 0).length;

export function mapToItems(map) {
  return Object.entries(map || {})
    .map(([serial, q]) => ({ serial_number: Number(serial), quantity: Math.floor(Number(q)) || 0 }))
    .filter((it) => it.quantity > 0)
    .sort((a, b) => a.serial_number - b.serial_number);
}

// Return lines: the faulty part can never exceed the returned quantity.
export function returnItems(qtyMap, faultyMap) {
  return mapToItems(qtyMap).map((it) => ({
    ...it,
    faulty_quantity: Math.min(it.quantity, Math.max(0, Math.floor(Number(faultyMap?.[it.serial_number])) || 0)),
  }));
}

// Serial numbers whose quantity is above the allowed limit.
export function overLimit(map, limits) {
  if (!limits) return [];
  return Object.entries(map || {})
    .filter(([serial, q]) => Number(q) > 0 && Number(q) > (limits[serial] ?? 0))
    .map(([serial]) => Number(serial));
}