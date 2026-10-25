// Fixed choice lists with their Hebrew / English labels.

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', he: 'העברה בנקאית', en: 'Bank transfer' },
  { value: 'cash', he: 'מזומן', en: 'Cash' },
  { value: 'check', he: "צ'ק", en: 'Check' },
  { value: 'credit_card', he: 'כרטיס אשראי', en: 'Credit card' },
  { value: 'other', he: 'אחר', en: 'Other' },
];

export const PREORDER_STATUSES = [
  { value: 'open', he: 'פתוחה', en: 'Open' },
  { value: 'fulfilled', he: 'סופקה', en: 'Fulfilled' },
  { value: 'cancelled', he: 'בוטלה', en: 'Cancelled' },
];

export function optionLabel(options, value, t) {
  const option = options.find((o) => o.value === value);
  return option ? t(option.he, option.en) : value || '—';
}