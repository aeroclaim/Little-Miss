// Pure formatting helpers. No network, no side effects.

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
export const round4 = (v) => Math.round((num(v) + Number.EPSILON) * 10000) / 10000;

const localeOf = (lang) => (lang === 'en' ? 'en-US' : 'he-IL');

export function formatNumber(v, lang = 'he') {
  return new Intl.NumberFormat(localeOf(lang)).format(num(v));
}

export function formatILS(v, lang = 'he', digits = 2) {
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(v));
}

export function formatPercent(ratio, digits = 0) {
  return `${(num(ratio) * 100).toFixed(digits)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sumQty(items, field = 'quantity') {
  return (items || []).reduce((sum, it) => sum + num(it[field]), 0);
}

export function indexBy(list, key = 'id') {
  const out = {};
  for (const row of list || []) out[row[key]] = row;
  return out;
}

// Case-insensitive match of a search text against a store's name and town.
export function matchesStore(store, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return `${store?.name || ''} ${store?.town || ''}`.toLowerCase().includes(q);
}

// Turns whatever the owner pasted as a product-file link into a safe, clickable address.
export function safeHref(link) {
  const v = String(link || '').trim();
  if (!v) return null;
  if (/^(https?:|file:|mailto:)/i.test(v)) return v;
  if (/^[a-zA-Z]:[\\/]/.test(v)) return `file:///${v.replace(/\\/g, '/')}`;
  if (/^\\\\/.test(v)) return `file:${v.replace(/\\/g, '/')}`;
  if (/^(www\.|[\w-]+\.[a-z]{2,}(\/|$))/i.test(v)) return `https://${v}`;
  return null;
}