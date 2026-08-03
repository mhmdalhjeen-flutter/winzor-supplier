import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../../services/api';
import { getMyStore } from '../../services/store.service';
import { getStoredUser } from '../../utils/safeStorage';
import { queryKeys } from '../../lib/queryClient';
import { unwrapList } from '../../utils/unwrapList';
import DashboardStatCards from '../../components/dashboard/DashboardStatCards';
import OrderQuickNav from '../../components/dashboard/OrderQuickNav';
import OrderSummaryCard from '../../components/orders/OrderSummaryCard';
import LightLoadingHint from '../../shared/LightLoadingHint';
import {
  ORDER_FILTER_KEYS,
  ORDER_FILTER_GROUPS,
  orderMatchesFilter,
  countOrdersByFilter,
} from '../../utils/storeOrderLabels';
import '../../styles/dashboard.css';
import '../../styles/storeDashboard.css';

export default function DashboardHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = getStoredUser({});
  const isSupplier = user?.role === 'supplier';
  const baseRoute = isSupplier ? '/supplier' : '/store';

  const [activeFilter, setActiveFilter] = useState(ORDER_FILTER_KEYS.PENDING);
  const [deliveringId, setDeliveringId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (location.state?.orderFilter) {
      setActiveFilter(location.state.orderFilter);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.orderFilter, location.pathname, navigate]);

  const { data: storeResponse } = useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async () => {
      const { data } = await getMyStore();
      return data;
    },
    enabled: !isSupplier,
    staleTime: 5 * 60 * 1000,
  });

  const store = storeResponse?.store;

  const { data: dashboardData, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
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
    },
    staleTime: 30 * 1000,
  });

  const allOrders = dashboardData?.allOrders ?? [];
  const cards = dashboardData?.cards ?? 0;
  const bypassCards = dashboardData?.bypassCards ?? false;
  const customersCount = store?.customersCount ?? 0;
  const pendingCount = countOrdersByFilter(allOrders, ORDER_FILTER_KEYS.PENDING);

  const filterCounts = useMemo(() => ({
    [ORDER_FILTER_KEYS.PENDING]: countOrdersByFilter(allOrders, ORDER_FILTER_KEYS.PENDING),
    [ORDER_FILTER_KEYS.CONFIRMED]: countOrdersByFilter(allOrders, ORDER_FILTER_KEYS.CONFIRMED),
    [ORDER_FILTER_KEYS.DELIVERED]: countOrdersByFilter(allOrders, ORDER_FILTER_KEYS.DELIVERED),
    [ORDER_FILTER_KEYS.REJECTED]: countOrdersByFilter(allOrders, ORDER_FILTER_KEYS.REJECTED),
  }), [allOrders]);

  const filteredOrders = useMemo(
    () => allOrders.filter((o) => orderMatchesFilter(o, activeFilter)),
    [allOrders, activeFilter],
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openOrder = (order) => {
    navigate(`${baseRoute}/orders/${order._id}`);
  };

  const handleDeliver = async (order) => {
    setDeliveringId(order._id);
    try {
      const res = await axios.patch(`/orders/${order._id}/status`, {
        status: 'delivered_to_driver',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.storeOrders });
      queryClient.invalidateQueries({ queryKey: ['storeOrderHistory'] });
      showToast(res.data.message || 'تم تسليم الطلب للدليفري');
      setActiveFilter(ORDER_FILTER_KEYS.DELIVERED);
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر تحديث الحالة');
    } finally {
      setDeliveringId(null);
    }
  };

  const activeGroup = ORDER_FILTER_GROUPS[activeFilter];

  return (
    <div className="store-dashboard" dir="rtl">
      {!isSupplier && store?.name ? (
        <div className="dashboard-home-store">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="dashboard-home-store__logo" />
          ) : (
            <div className="dashboard-home-store__logo dashboard-home-store__logo--fallback">
              {store.name.charAt(0)}
            </div>
          )}
          <div className="dashboard-home-store__text">
            <h2 className="title dashboard-home-store__name">{store.name}</h2>
            <p className="dashboard-home-store__subtitle">لوحة التحكم — إدارة الطلبات</p>
          </div>
        </div>
      ) : (
        <header className="store-dashboard__header">
          <h2 className="title">لوحة التحكم</h2>
          <p className="store-dashboard__subtitle">نظرة عامة على أهم معلومات متجرك</p>
        </header>
      )}

      <DashboardStatCards
        customersCount={customersCount}
        pendingCount={pendingCount}
        cards={cards}
        bypassCards={bypassCards}
        loading={statsLoading}
      />

      <OrderQuickNav
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={filterCounts}
      />

      <section className="store-dashboard__orders">
        <div className="store-dashboard__orders-head">
          <h3 className="store-dashboard__orders-title">{activeGroup.label}</h3>
          <span className="store-dashboard__orders-count">
            {filteredOrders.length} طلب
          </span>
        </div>

        {toast && <div className="store-dash-toast">{toast}</div>}

        {statsLoading && filteredOrders.length === 0 && (
          <LightLoadingHint label="جاري تحميل الطلبات..." />
        )}

        {!statsLoading && filteredOrders.length === 0 && (
          <div className="store-dash-empty">
            <div className="store-dash-empty__icon">📭</div>
            <p>لا توجد طلبات في هذا القسم</p>
          </div>
        )}

        {filteredOrders.length > 0 && (
          <div className="store-dashboard__orders-list">
            {filteredOrders.map((order) => (
              <OrderSummaryCard
                key={order._id}
                order={order}
                filterKey={activeFilter}
                onOpen={openOrder}
                onDeliver={handleDeliver}
                busy={deliveringId === order._id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
