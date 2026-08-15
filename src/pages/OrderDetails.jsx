import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import axios from '../services/api';
import { queryKeys } from '../lib/queryClient';
import { getStoredUser } from '../utils/safeStorage';
import LightLoadingHint from '../shared/LightLoadingHint';
import OrderInvoiceView from '../components/orders/OrderInvoiceView';
import ConfirmOrderDialog from '../components/orders/ConfirmOrderDialog';
import RejectOrderDialog from '../components/orders/RejectOrderDialog';
import RequestModificationDialog from '../components/orders/RequestModificationDialog';
import RequestPaymentModificationDialog from '../components/orders/RequestPaymentModificationDialog';
import {
  getOrderLegacyStatus,
  shouldSkipConfirmDisclaimer,
  ORDER_FILTER_KEYS,
  getDeliverActionLabel,
  getDeliverTargetStatus,
  isConfirmedWaitingStatus,
  canStoreCompleteHandoff,
  isCustomerPickupMethod,
  isDigitalPayment,
} from '../utils/storeOrderLabels';
import '../styles/Orders.css';
import '../styles/storeDashboard.css';

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const userId = user?.id || user?._id;

  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showPaymentModifyDialog, setShowPaymentModifyDialog] = useState(false);
  const statusChangeInFlight = useRef(false);

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orderDetail', orderId],
    queryFn: async () => {
      const res = await axios.get(`/orders/${orderId}`);
      return res.data.order;
    },
    enabled: Boolean(orderId),
    staleTime: 15 * 1000,
  });

  const legacyStatus = order ? getOrderLegacyStatus(order) : null;
  const isPending = legacyStatus === 'pending';
  const isNeedsModification = legacyStatus === 'modification_requested';
  const isConfirmedWaiting = legacyStatus ? isConfirmedWaitingStatus(legacyStatus) : false;
  const handoffReady = order ? canStoreCompleteHandoff(order) : false;
  const waitingForDriver = order
    && !isCustomerPickupMethod(order.deliveryMethod)
    && isConfirmedWaiting
    && !handoffReady;
  const showActions = isPending;
  const showDeliverAction = isConfirmedWaiting;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const invalidateOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.storeOrders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      queryClient.invalidateQueries({ queryKey: ['storeOrderHistory'] }),
      queryClient.invalidateQueries({ queryKey: ['orderDetail', orderId] }),
    ]);
    await queryClient.refetchQueries({ queryKey: queryKeys.dashboardStats, type: 'active' });
  };

  const changeStatus = async (newStatus, extra = {}) => {
    if (statusChangeInFlight.current) return;
    statusChangeInFlight.current = true;
    setUpdating(true);
    try {
      const res = await axios.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        ...extra,
      });
      await invalidateOrders();
      showToast(res.data.message || 'تم تحديث حالة الطلب');

      let orderFilter = null;
      if (newStatus === 'store_accepted') orderFilter = ORDER_FILTER_KEYS.CONFIRMED;
      else if (newStatus === 'rejected') orderFilter = ORDER_FILTER_KEYS.REJECTED;
      else if (
        newStatus === 'delivered_to_driver'
        || newStatus === 'delivered_to_customer'
        || newStatus === 'delivery_handover_complete'
      ) {
        orderFilter = ORDER_FILTER_KEYS.DELIVERED;
      }

      navigate(baseRoute, { replace: true, state: orderFilter ? { orderFilter } : {} });
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر تحديث الحالة');
    } finally {
      statusChangeInFlight.current = false;
      setUpdating(false);
    }
  };

  const handleConfirmRequest = () => {
    if (updating || statusChangeInFlight.current) return;
    if (shouldSkipConfirmDisclaimer(userId)) {
      changeStatus('store_accepted');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmDialog = () => {
    if (updating || statusChangeInFlight.current) return;
    setShowConfirmDialog(false);
    changeStatus('store_accepted');
  };

  const handleRejectConfirm = async (reason) => {
    setShowRejectDialog(false);
    await changeStatus('rejected', { rejectionReason: reason });
  };

  const handleModificationConfirm = async (payload) => {
    setUpdating(true);
    try {
      const res = await axios.post(`/orders/${orderId}/request-modification`, payload);
      await invalidateOrders();
      showToast(res.data.message || 'تم إرسال طلب التعديل');
      setShowModifyDialog(false);
      navigate(baseRoute, {
        replace: true,
        state: { orderFilter: ORDER_FILTER_KEYS.NEEDS_MODIFICATION },
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر إرسال طلب التعديل');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliver = () => {
    if (!order || !handoffReady) {
      if (waitingForDriver) {
        showToast('بانتظار تعيين السائق من شركة التوصيل');
      }
      return;
    }
    changeStatus(getDeliverTargetStatus(order.deliveryMethod));
  };

  const loadError = error?.response?.data?.message || 'تعذّر تحميل تفاصيل الطلب';

  return (
    <div className="order-details-page" dir="rtl">
      <header className="order-details-page__head">
        <button
          type="button"
          className="order-details-page__back"
          onClick={() => navigate(baseRoute)}
        >
          <ArrowRight size={20} />
          <span>العودة</span>
        </button>
        <h1 className="order-details-page__title">تفاصيل الطلب</h1>
      </header>

      {toast && <div className="store-dash-toast">{toast}</div>}

      <ConfirmOrderDialog
        open={showConfirmDialog}
        userId={userId}
        loading={updating}
        onClose={() => !updating && setShowConfirmDialog(false)}
        onConfirm={handleConfirmDialog}
      />

      <RejectOrderDialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleRejectConfirm}
        loading={updating}
      />

      <RequestPaymentModificationDialog
        open={showPaymentModifyDialog}
        onClose={() => setShowPaymentModifyDialog(false)}
        onConfirm={handleModificationConfirm}
        loading={updating}
        order={order}
      />

      <RequestModificationDialog
        open={showModifyDialog}
        onClose={() => setShowModifyDialog(false)}
        onConfirm={handleModificationConfirm}
        loading={updating}
        items={order?.items || []}
        allowAreaTooFar={
          order?.deliveryMethod === 'nearby' || order?.deliveryMethod === 'nearby_store'
        }
      />

      {isLoading && <LightLoadingHint label="جاري تحميل الطلب..." />}

      {isError && !isLoading && (
        <div className="store-dash-empty">
          <p>{loadError}</p>
          <div className="store-dash-empty__actions">
            <button type="button" onClick={() => refetch()}>إعادة المحاولة</button>
            <button type="button" onClick={() => navigate(baseRoute)}>العودة للرئيسية</button>
          </div>
        </div>
      )}

      {!isLoading && !isError && order && (
        <>
          {isNeedsModification && order.modificationRequest?.message && (
            <div className="order-details-page__mod-banner">
              <strong>بانتظار تعديل الزبون</strong>
              <p>{order.modificationRequest.message}</p>
            </div>
          )}

          <OrderInvoiceView order={order} />

          {(showActions || showDeliverAction) && (
            <div className="order-details-page__actions">
              {showActions && (
                <>
                  <button
                    type="button"
                    className="order-details-page__btn order-details-page__btn--primary"
                    disabled={updating}
                    onClick={handleConfirmRequest}
                  >
                    {updating ? 'جارٍ التأكيد...' : 'تأكيد الطلب'}
                  </button>
                  <button
                    type="button"
                    className="order-details-page__btn order-details-page__btn--modify"
                    disabled={updating}
                    onClick={() => setShowPaymentModifyDialog(true)}
                  >
                    {isDigitalPayment(order?.paymentMethod)
                      ? 'مراجعة بيانات الدفع'
                      : 'طلب تغيير طريقة الدفع'}
                  </button>
                  <button
                    type="button"
                    className="order-details-page__btn order-details-page__btn--modify"
                    disabled={updating}
                    onClick={() => setShowModifyDialog(true)}
                  >
                    طلب تعديل
                  </button>
                  <button
                    type="button"
                    className="order-details-page__btn order-details-page__btn--secondary"
                    disabled={updating}
                    onClick={() => setShowRejectDialog(true)}
                  >
                    رفض الطلب
                  </button>
                </>
              )}
              {showDeliverAction && (
                <>
                  {waitingForDriver && (
                    <p className="order-details-page__hint">بانتظار تعيين السائق من شركة التوصيل</p>
                  )}
                  <button
                    type="button"
                    className="order-details-page__btn order-details-page__btn--primary"
                    disabled={updating || !handoffReady}
                    onClick={handleDeliver}
                  >
                    {updating ? 'جارٍ التحديث...' : getDeliverActionLabel(order.deliveryMethod)}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
