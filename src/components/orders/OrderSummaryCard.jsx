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

  const handleClick = () => onOpen?.(order);
  const showDeliverAction = filterKey === ORDER_FILTER_KEYS.CONFIRMED
    && ['store_accepted', 'confirmed', 'preparing'].includes(status);

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
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
            </div>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">رقم التأكيد</span>
              <strong>{confirmationNumber}</strong>
            </div>
            {order.deliveryAddress && (
              <div className="order-summary-card__row">
                <span className="order-summary-card__label">العنوان</span>
                <strong className="order-summary-card__address">{order.deliveryAddress}</strong>
              </div>
            )}
            {phone && (
              <div className="order-summary-card__row">
                <span className="order-summary-card__label">الهاتف</span>
                <strong dir="ltr">{phone}</strong>
              </div>
            )}
          </>
        )}

        {filterKey === ORDER_FILTER_KEYS.DELIVERED && (
          <>
            <div className="order-summary-card__row">
              <span className="order-summary-card__label">الزبون</span>
              <strong>{customerName}</strong>
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
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onDeliver?.(order);
          }}
        >
          {busy ? 'جارٍ التحديث...' : 'تم التسليم للدليفري'}
        </button>
      )}

      <span className="order-summary-card__chevron" aria-hidden="true">‹</span>
    </article>
  );
}
