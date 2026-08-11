export const PAYMENT_TYPE_LABELS = {
  bank_palestine: 'بنك فلسطين',
  palpay: 'محفظة',
  jawwal_pay: 'جوال بي',
};

export function paymentTypeLabel(type) {
  return PAYMENT_TYPE_LABELS[type] || type || '—';
}

export function needsSubscriptionPayment(sub) {
  if (!sub) return false;
  if (sub.paymentRejected) return true;
  if (['active', 'exempted', 'payment_pending'].includes(sub.status)) return false;
  return Boolean(sub.needsPayment);
}

export function isSubscriptionOperational(sub) {
  if (!sub) return true;
  if (sub.paymentRejected) return false;
  if (sub.subscriptionActive === false) return false;
  return sub.canOperate !== false;
}
