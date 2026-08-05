export const PURCHASE_MODES = Object.freeze(['quantity', 'price', 'both']);

export function normalizePurchaseMode(value) {
  const v = String(value || 'both').toLowerCase().trim();
  return PURCHASE_MODES.includes(v) ? v : 'both';
}

export function purchaseModeLabel(mode) {
  switch (normalizePurchaseMode(mode)) {
    case 'price': return 'بالقيمة فقط';
    case 'both': return 'بالكمية أو بالقيمة';
    default: return 'بالكمية فقط';
  }
}

export function purchaseMethodLabel(method) {
  return (method || 'quantity') === 'price' ? 'بالقيمة' : 'بالكمية';
}

export function formatOrderLineMeta(item) {
  const method = item?.purchaseMethod || 'quantity';
  if (method === 'price') {
    const amount = item.requestedAmount ?? item.subtotal ?? item.price ?? 0;
    return `${Number(amount).toFixed(2)} ₪ (بالقيمة)`;
  }
  const price = item.price ?? 0;
  const qty = item.quantity ?? 0;
  return `${price.toFixed(2)} ₪ × ${qty}`;
}
