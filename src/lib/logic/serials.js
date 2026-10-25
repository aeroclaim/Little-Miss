// Serial numbers are the core identity of every notepad.
// A collection is simply a consecutive range of serial numbers (e.g. food = 1-14).

export const TONES = [
  { bg: '#FBD5E0', fg: '#8E1F4A' },
  { bg: '#E3D5F7', fg: '#5B2E91' },
  { bg: '#CDEBDC', fg: '#1F6B4A' },
  { bg: '#FDEBB8', fg: '#7A5A00' },
  { bg: '#CFE5F8', fg: '#1D5A8C' },
  { bg: '#FBD9C4', fg: '#9A4B1B' },
  { bg: '#DCEBC0', fg: '#4B6B14' },
  { bg: '#F2D2EE', fg: '#8A2F7F' },
];
export const NEUTRAL_TONE = { bg: '#ECE9F2', fg: '#5C5870' };

export function rangeSerials(from, to) {
  const a = Number(from);
  const b = Number(to);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function sortCollections(collections = []) {
  return [...collections].sort((x, y) => x.serial_from - y.serial_from);
}

export function collectionOf(serial, collections) {
  return collections.find((c) => serial >= c.serial_from && serial <= c.serial_to) || null;
}

export function toneOf(collection, sortedCollections) {
  if (!collection) return NEUTRAL_TONE;
  const idx = sortedCollections.findIndex((c) => c.id === collection.id);
  return idx < 0 ? NEUTRAL_TONE : TONES[idx % TONES.length];
}

// Returns null when the range is fine, otherwise { code: 'invalid' | 'overlap', with? }
export function validateCollectionRange({ serial_from, serial_to }, collections, ignoreId) {
  const a = Number(serial_from);
  const b = Number(serial_to);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) return { code: 'invalid' };
  const clash = collections.find((c) => c.id !== ignoreId && a <= c.serial_to && b >= c.serial_from);
  return clash ? { code: 'overlap', with: clash } : null;
}

// Every serial that exists in the catalog: all collection ranges + any product record.
export function buildCatalog(collections = [], products = []) {
  const sorted = sortCollections(collections);
  const productBySerial = new Map(products.map((p) => [p.serial_number, p]));
  const serials = new Set(products.map((p) => p.serial_number));
  for (const c of sorted) for (const s of rangeSerials(c.serial_from, c.serial_to)) serials.add(s);
  return [...serials]
    .sort((a, b) => a - b)
    .map((serial) => ({ serial, product: productBySerial.get(serial) || null, collection: collectionOf(serial, sorted) }));
}

export function missingProductSerials(collections = [], products = []) {
  const have = new Set(products.map((p) => p.serial_number));
  const out = [];
  for (const c of collections) for (const s of rangeSerials(c.serial_from, c.serial_to)) if (!have.has(s)) out.push(s);
  return out;
}

export function collectionLabel(collection, lang = 'he') {
  if (!collection) return lang === 'en' ? 'Uncategorized' : 'ללא אוסף';
  return lang === 'en' ? collection.name_en || collection.name : collection.name;
}

export function productLabel(entry, lang = 'he') {
  const p = entry?.product;
  if (!p) return '';
  return (lang === 'en' ? p.name_en || p.name : p.name || p.name_en) || '';
}