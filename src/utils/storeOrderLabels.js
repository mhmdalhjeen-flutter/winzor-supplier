export const STORE_ORDER_STATUS = {
  pending: { label: 'قيد المراجعة', tone: 'review' },
  store_accepted: { label: 'تم التأكيد', tone: 'confirmed' },
  confirmed: { label: 'تم التأكيد', tone: 'confirmed' },
  preparing: { label: 'تم التأكيد', tone: 'confirmed' },
  delivered_to_driver: { label: 'تم التأكيد', tone: 'confirmed' },
  rejected: { label: 'مرفوض', tone: 'rejected' },
  cancelled: { label: 'ملغى', tone: 'rejected' },
  delivered_to_customer: { label: 'مكتمل', tone: 'completed' },
  delivered: { label: 'مكتمل', tone: 'completed' },
  completed_off_platform: { label: 'مكتمل', tone: 'completed' },
};

export const DELIVERY_METHOD_LABELS = {
  nearby: 'أنا قريب من المتجر',
  pickup: 'سأستلم الطلب بنفسي',
  delivery: 'التوصيل عبر الدليفري',
};

export const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: 'الدفع عند التوصيل',
  seller_agreement: 'التفاهم مع البائع',
  bank_palestine: 'بنك فلسطين',
  palpay: 'PalPay',
  jawwal_pay: 'Jawwal Pay',
  cash: 'الدفع نقداً',
  transfer: 'تحويل بنكي',
};

export function getStoreOrderStatusMeta(status) {
  return STORE_ORDER_STATUS[status] || STORE_ORDER_STATUS.pending;
}

export function getDeliveryLabel(method) {
  return DELIVERY_METHOD_LABELS[method] || method || '—';
}

export function getPaymentLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—';
}

export function isDigitalPayment(method) {
  return ['bank_palestine', 'palpay', 'jawwal_pay', 'transfer'].includes(method);
}

export const CONFIRM_DISCLAIMER_KEY = 'winzor_order_confirm_disclaimer_skip';

export function shouldSkipConfirmDisclaimer(userId) {
  try {
    const raw = localStorage.getItem(CONFIRM_DISCLAIMER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed[String(userId)] === true;
  } catch {
    return false;
  }
}

export function setSkipConfirmDisclaimer(userId, skip) {
  try {
    const raw = localStorage.getItem(CONFIRM_DISCLAIMER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[String(userId)] = skip;
    localStorage.setItem(CONFIRM_DISCLAIMER_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function formatOrderDate(iso) {
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
