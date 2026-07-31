import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../services/api';
import '../styles/dashboard.css';
import '../styles/Orders.css';
import { queryKeys } from '../lib/queryClient';
import { unwrapList } from '../utils/unwrapList';
import LightLoadingHint from '../shared/LightLoadingHint';
import { getStoredUser } from '../utils/safeStorage';
import StoreOrderCard from '../components/orders/StoreOrderCard';
import ConfirmOrderDialog from '../components/orders/ConfirmOrderDialog';
import RejectOrderDialog from '../components/orders/RejectOrderDialog';
import {
  shouldSkipConfirmDisclaimer,
  getStoreOrderStatusMeta,
  formatOrderDate,
} from '../utils/storeOrderLabels';

const ACTIVE_STATUSES = new Set([
  'pending',
  'store_accepted',
  'confirmed',
  'preparing',
  'delivered_to_driver',
]);

export default function Orders() {
  const navigate = useNavigate();
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const userId = user?.id || user?._id;

  const [updating, setUpdating] = useState(null);
  const [toast, setToast] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const queryClient = useQueryClient();

  const { data: ordersData = [], isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: queryKeys.storeOrders,
    queryFn: async () => {
      const res = await axios.get('/orders/store');
      return unwrapList(res.data, ['orders']);
    },
    staleTime: 30 * 1000,
  });

  const orders = (Array.isArray(ordersData) ? ordersData : []).filter(
    (o) => ACTIVE_STATUSES.has(o.status),
  );
  const loadError = queryError?.response?.data?.message || (queryError ? 'تعذّر تحميل الطلبات' : '');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const changeStatus = async (orderId, newStatus, extra = {}) => {
    setUpdating(orderId);
    try {
      const res = await axios.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        ...extra,
      });
      queryClient.setQueryData(queryKeys.storeOrders, (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (res.data?.deleted || res.data?.archived || newStatus === 'rejected') {
          return list.filter((o) => o._id !== orderId);
        }
        return list.map((o) => (
          o._id === orderId ? { ...o, status: res.data?.order?.status || newStatus } : o
        ));
      });
      showToast(res.data.message || 'تم تحديث حالة الطلب');
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر تحديث الحالة');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmRequest = (order) => {
    setConfirmTarget(order);
    if (shouldSkipConfirmDisclaimer(userId)) {
      changeStatus(order._id, 'store_accepted');
      setConfirmTarget(null);
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmDialog = () => {
    if (!confirmTarget) return;
    const orderId = confirmTarget._id;
    setShowConfirmDialog(false);
    setConfirmTarget(null);
    changeStatus(orderId, 'store_accepted');
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    const orderId = rejectTarget._id;
    setRejectTarget(null);
    await changeStatus(orderId, 'rejected', { rejectionReason: reason });
  };

  const openWhatsappWithOrder = (order) => {
    const phone = order.customer?.phone?.replace(/\D/g, '');
    if (!phone) return showToast('رقم الزبون غير متاح');
    const orderNo = order.orderNumber || order._id.slice(-6).toUpperCase();
    const itemsList = (order.items || []).map((i) => `• ${i.name} ×${i.quantity} — ${i.price * i.quantity} ₪`).join('\n');
    const msg = encodeURIComponent(
      `مرحباً ${order.customer?.name || ''},\n`
      + `بخصوص طلبك رقم: ${orderNo}\n\n`
      + `📦 الطلب:\n${itemsList}\n\n`
      + `💰 الإجمالي: ${order.total} ₪\n`
      + `📅 التاريخ: ${formatOrderDate(order.createdAt)}\n\n`
      + `الحالة: ${getStoreOrderStatusMeta(order.status).label}`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const openChatWithOrder = (order) => {
    const itemsList = (order.items || []).map((i) => `${i.name} ×${i.quantity}`).join('، ');
    const orderNo = order.orderNumber || order._id.slice(-6).toUpperCase();
    const context = {
      storeOwnerId: order.customer?._id,
      productName: `طلب رقم ${orderNo}`,
      productPrice: order.total,
      productId: null,
      productImg: null,
      productUrl: null,
      itemType: 'Product',
      prefillText:
        `📋 بخصوص طلبك رقم: ${orderNo}\n`
        + `📦 ${itemsList}\n`
        + `💰 الإجمالي: ${order.total} ₪\n`
        + `الحالة: ${getStoreOrderStatusMeta(order.status).label}`,
    };
    localStorage.setItem('chatContext', JSON.stringify(context));
    navigate(`${baseRoute}/chats`);
  };

  return (
    <div className="orders-page" dir="rtl">
      <header className="orders-page__head">
        <div>
          <h2 className="title">📋 طلبات المتجر</h2>
          <p className="orders-page__lead">راجع الطلبات، تحقق من الدفع، وأكّد أو ارفض</p>
        </div>
        <div className="orders-page__links">
          <button type="button" className="orders-page__link-btn" onClick={() => navigate(`${baseRoute}/orders/invoices`)}>
            🧾 فواتير الطلبات
          </button>
          <button type="button" className="orders-page__link-btn orders-page__link-btn--muted" onClick={() => navigate(`${baseRoute}/orders/history`)}>
            📜 الطلبات السابقة
          </button>
        </div>
      </header>

      {toast && <div className="orders-toast">{toast}</div>}

      <ConfirmOrderDialog
        open={showConfirmDialog}
        userId={userId}
        onClose={() => { setShowConfirmDialog(false); setConfirmTarget(null); }}
        onConfirm={handleConfirmDialog}
      />

      <RejectOrderDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={Boolean(updating && rejectTarget?._id === updating)}
      />

      {isLoading && orders.length === 0 && (
        <LightLoadingHint label="جاري تحميل الطلبات..." />
      )}

      {isError && !isLoading && (
        <div className="orders-page__error">
          <p>{loadError}</p>
          <button type="button" onClick={() => refetch()}>إعادة المحاولة</button>
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="orders-page__empty">
          <div className="orders-page__empty-icon">📭</div>
          <p>لا توجد طلبات للمراجعة حالياً</p>
        </div>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="store-orders-list">
          {orders.map((order) => (
            <StoreOrderCard
              key={order._id}
              order={order}
              busy={updating === order._id}
              onConfirm={handleConfirmRequest}
              onReject={setRejectTarget}
              onWhatsapp={openWhatsappWithOrder}
              onChat={openChatWithOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
