import api from '../services/api';
import { getMyStore } from '../services/store.service';
import { getMyProducts } from '../services/products.service';
import { getMyOffers, getDashboardOffers } from '../services/offers.service';
import { fetchCategoryTree, fetchRegionTree } from '../services/catalog.service';
import { getNotifications } from '../services/notifications.service';
import { queryKeys } from './queryClient';
import { unwrapList } from '../utils/unwrapList';
import { cleanupNotifications } from '../utils/notificationCleanup';
import { fetchDashboardStats } from './dashboardStats';

function isAuthenticated() {
  return Boolean(localStorage.getItem('token'));
}

/**
 * Background prefetch on authenticated online open — never blocks UI.
 * Reuses existing services + queryKeys so pages hydrate from the same cache.
 */
export function scheduleBackgroundRefresh(queryClient) {
  if (typeof window === 'undefined') return;
  if (!isAuthenticated() || !navigator.onLine) return;

  const run = () => {
    if (!isAuthenticated() || !navigator.onLine) return;

    const tasks = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.myStore,
        queryFn: async () => {
          const { data } = await getMyStore();
          return data;
        },
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.myProducts,
        queryFn: async () => {
          const { data } = await getMyProducts(true);
          return unwrapList(data, ['products']);
        },
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.myOffersAll,
        queryFn: async () => {
          const { data } = await getMyOffers(true);
          return unwrapList(data, ['offers']);
        },
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardStats,
        queryFn: fetchDashboardStats,
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardOffers,
        queryFn: async () => {
          const res = await getDashboardOffers(3, 3);
          return {
            ownOffers: res.data.ownOffers || [],
            networkOffers: res.data.networkOffers || [],
          };
        },
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.storeOrders,
        queryFn: async () => {
          const res = await api.get('/orders/store');
          return unwrapList(res.data, ['orders']);
        },
        staleTime: 30 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.categoryTree('product'),
        queryFn: () => fetchCategoryTree('product'),
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.regionTree,
        queryFn: () => fetchRegionTree(),
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.notifications,
        queryFn: async () => {
          const { data } = await getNotifications();
          return cleanupNotifications(data.notifications || []);
        },
        staleTime: 30 * 1000,
      }),
    ];

    Promise.allSettled(tasks).catch(() => {});
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 800);
  }
}
