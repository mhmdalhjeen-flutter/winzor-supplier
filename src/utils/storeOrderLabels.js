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
  nearby_store: 'أنا قريب من المتجر',
  pickup: 'سأستلم الطلب بنفسي',
  delivery: 'شركة توصيل',
};

export const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: 'الدفع عند التوصيل',
  seller_agreement: 'التفاهم مع البائع',
  bank_palestine: 'بنك فلسطين',
  bank: 'تحويل بنكي',
  palpay: 'PalPay',
  jawwal_pay: 'Jawwal Pay',
  cash: 'الدفع نقداً',
  transfer: 'تحويل بنكي',
};

/** Customer pickup methods (self / nearby) vs delivery company. */
export function isCustomerPickupMethod(method) {
  const key = String(method || '').trim().toLowerCase();
  return key === 'pickup' || key === 'nearby' || key === 'nearby_store';
}

export function getDeliverActionLabel(method) {
  return isCustomerPickupMethod(method) ? 'تم التسليم للزبون' : 'تم التسليم';
}

export function getFulfillmentBadge(method) {
  if (isCustomerPickupMethod(method)) {
    return { label: 'الزبون', tone: 'customer' };
  }
  return { label: 'الدلفري', tone: 'delivery' };
}

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
  return ['bank_palestine', 'bank', 'palpay', 'jawwal_pay', 'transfer'].includes(method);
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

export function formatOrderDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CANONICAL_TO_LEGACY = {
  pending_review: 'pending',
  confirmed: 'store_accepted',
  rejected: 'rejected',
  completed: 'delivered_to_customer',
};

/** Resolve legacy DB status for filtering and actions. */
export function getOrderLegacyStatus(order) {
  if (order?.legacyStatus) return order.legacyStatus;
  if (order?.status && CANONICAL_TO_LEGACY[order.status]) {
    return CANONICAL_TO_LEGACY[order.status];
  }
  return order?.status || 'pending';
}

export const ORDER_FILTER_KEYS = {
  PENDING: 'pending_review',
  CONFIRMED: 'confirmed_waiting',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
};

export const ORDER_FILTER_GROUPS = {
  [ORDER_FILTER_KEYS.PENDING]: {
    key: ORDER_FILTER_KEYS.PENDING,
    label: 'بانتظار المراجعة',
    shortLabel: 'للمراجعة',
    statuses: ['pending'],
  },
  [ORDER_FILTER_KEYS.CONFIRMED]: {
    key: ORDER_FILTER_KEYS.CONFIRMED,
    label: 'مؤكدة بانتظار التسليم',
    shortLabel: 'بانتظار التسليم',
    statuses: ['store_accepted', 'confirmed', 'preparing'],
  },
  [ORDER_FILTER_KEYS.DELIVERED]: {
    key: ORDER_FILTER_KEYS.DELIVERED,
    label: 'مكتملة',
    shortLabel: 'مكتملة',
    statuses: ['delivered_to_driver', 'delivered_to_customer', 'delivered', 'completed_off_platform'],
  },
  [ORDER_FILTER_KEYS.REJECTED]: {
    key: ORDER_FILTER_KEYS.REJECTED,
    label: 'مرفوضة',
    shortLabel: 'مرفوضة',
    statuses: ['rejected', 'cancelled'],
  },
};

export function getOrderFilterGroup(order) {
  const status = getOrderLegacyStatus(order);
  for (const group of Object.values(ORDER_FILTER_GROUPS)) {
    if (group.statuses.includes(status)) return group.key;
  }
  return null;
}

export function orderMatchesFilter(order, filterKey) {
  const group = ORDER_FILTER_GROUPS[filterKey];
  if (!group) return false;
  return group.statuses.includes(getOrderLegacyStatus(order));
}

export function countOrdersByFilter(orders, filterKey) {
  return orders.filter((o) => orderMatchesFilter(o, filterKey)).length;
}

export function getCustomerDisplayName(order) {
  return order.customerName || order.customer?.name || '—';
}

export function getCustomerDisplayPhone(order) {
  return order.customerPhone || order.customer?.phone || '';
}

export function getOrderDisplayNumber(order) {
  return order.orderNumber || order._id?.slice(-6)?.toUpperCase() || '—';
}

export function getConfirmationNumber(order) {
  return order.verificationCode || '—';
}

export function getDeliveryDate(order) {
  const timeline = order.statusTimeline || [];
  const deliveredEntry = [...timeline].reverse().find(
    (e) => ['delivered_to_driver', 'delivered_to_customer', 'delivered'].includes(e.status),
  );
  if (deliveredEntry?.at) return deliveredEntry.at;
  if (order.completedAt) return order.completedAt;
  if (getOrderLegacyStatus(order) === 'delivered_to_driver') return order.updatedAt;
  return order.updatedAt || order.createdAt;
}

export function getPaymentProofUrl(order) {
  return order.paymentProofImage || order.paymentProof || '';
}
