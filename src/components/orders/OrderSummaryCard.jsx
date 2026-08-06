import {
  ORDER_FILTER_KEYS,
  getStoreOrderStatusMeta,
  getOrderLegacyStatus,
  getCustomerDisplayName,
  getCustomerDisplayPhone,
  getOrderDisplayNumber,
  getConfirmationNumber,
  getDeliveryDate,
  formatOrderDateShort,
  getDeliverActionLabel,
  getFulfillmentBadge,
  getDeliveryLabel,
  getStoreConfirmationTime,
  getStoreOrderCurrentStatusLabel,
  isConfirmedWaitingStatus,
  canStoreCompleteHandoff,
  isCustomerPickupMethod,
} from '../../utils/storeOrderLabels';

export default function OrderSummaryCard({
  order,
  filterKey,
  onOpen,
  onDeliver,
  busy = false,
}) {
  const status = getOrderLegacyStatus(order);
  const statusMeta = getStoreOrderStatusMeta(status);
  const customerName = getCustomerDisplayName(order);
  const phone = getCustomerDisplayPhone(order);
  const orderNumber = getOrderDisplayNumber(order);
  const confirmationNumber = getConfirmationNumber(order);
  const fulfillBadge = getFulfillmentBadge(order.deliveryMethod);
  const companyName = order.deliveryCompanyName || order.deliverySession?.companyName || '';
  const handoffReady = canStoreCompleteHandoff(order);
  const waitingForDriver = !isCustomerPickupMethod(order.deliveryMethod)
    && isConfirmedWaitingStatus(status)
    && !handoffReady;

  const handleClick = () => onOpen?.(order);
  const showDeliverAction = filterKey === ORDER_FILTER_KEYS.CONFIRMED
    && isConfirmedWaitingStatus(status);

  return (
    <article
      className={`order-summary-card order-summary-card--${statusMeta.tone}`}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      role="button"
      tabIndex={0}
    >
      <div className="order-summary-card__content">
        {filterKey === ORDER_FILTER_KEYS.PENDING && (
          <>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
            </div>
            {phone && (
              <div className="order-summary-card__row">
                <span className="order-summary-card__label">الهاتف</span>
                <strong dir="ltr">{phone}</strong>
              </div>
            )}
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">رقم الطلب</span>
              <strong>{orderNumber}</strong>
            </div>
          </>
        )}

        {filterKey === ORDER_FILTER_KEYS.CONFIRMED && (
          <>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">رقم الطلب</span>
              <strong>{orderNumber}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">طريقة التسليم</span>
              <strong>{getDeliveryLabel(order.deliveryMethod)}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">وقت التأكيد</span>
              <strong>{formatOrderDateShort(getStoreConfirmationTime(order))}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الحالة</span>
              <span className={`order-summary-card__status order-summary-card__status--${statusMeta.tone}`}>
                {getStoreOrderCurrentStatusLabel(order)}
              </span>
            </div>
            {companyName && (
              <div className="order-summary-card__row">
                <span className="order-summary-card__label">شركة التوصيل</span>
                <strong>{companyName}</strong>
              </div>
            )}
            {waitingForDriver && (
              <p className="order-summary-card__hint">بانتظار تعيين السائق من شركة التوصيل</p>
            )}
          </>
        )}

        {filterKey === ORDER_FILTER_KEYS.DELIVERED && (
          <>
            <div className="order-summary-card__row order-summary-card__row--badge">
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
              <span
                className={`order-fulfill-badge order-fulfill-badge--${fulfillBadge.tone}`}
                title={fulfillBadge.label}
              >
                {fulfillBadge.label}
              </span>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">رقم التأكيد</span>
              <strong>{confirmationNumber}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">تاريخ التسليم</span>
              <strong>{formatOrderDateShort(getDeliveryDate(order))}</strong>
            </div>
          </>
        )}

        {filterKey === ORDER_FILTER_KEYS.REJECTED && (
          <>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">رقم الطلب</span>
              <strong>{orderNumber}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الحالة</span>
              <span className={`order-summary-card__status order-summary-card__status--${statusMeta.tone}`}>
                {statusMeta.label}
              </span>
            </div>
            {order.rejectionReason && (
              <p className="order-summary-card__reason">{order.rejectionReason}</p>
            )}
          </>
        )}
      </div>

      {showDeliverAction && (
        <button
          type="button"
          className="order-summary-card__deliver-btn"
          disabled={busy || !handoffReady}
          title={waitingForDriver ? 'بانتظار تعيين السائق من شركة التوصيل' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (!handoffReady) return;
            onDeliver?.(order);
          }}
        >
          {busy ? 'جارٍ التحديث...' : getDeliverActionLabel(order.deliveryMethod)}
        </button>
      )}

      <span className="order-summary-card__chevron" aria-hidden="true">‹</span>
    </article>
  );
}
