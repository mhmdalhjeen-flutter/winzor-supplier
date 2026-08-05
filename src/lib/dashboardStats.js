import axios from '../services/api';
import { unwrapList } from '../utils/unwrapList';

/**
 * Shared dashboard stats loader — used by DashboardHome and background prefetch
 * so React Query cache shapes stay identical.
 */
export async function fetchDashboardStats() {
  const [ordersRes, historyRes] = await Promise.allSettled([
    axios.get('/orders/store'),
    axios.get('/orders/store/history'),
  ]);

  const activePayload = ordersRes.status === 'fulfilled' ? ordersRes.value.data : {};
  const activeOrders = unwrapList(activePayload, ['orders']);
  const historyOrders = historyRes.status === 'fulfilled'
    ? unwrapList(historyRes.value.data, ['orders'])
    : [];

  const cards = activePayload.cards ?? 0;
  const bypassCards = activePayload.bypassCards ?? false;

  const allOrdersMap = new Map();
  [...activeOrders, ...historyOrders].forEach((o) => {
    if (o?._id) allOrdersMap.set(o._id, o);
  });
  const allOrders = Array.from(allOrdersMap.values());

  return { allOrders, cards, bypassCards };
}
