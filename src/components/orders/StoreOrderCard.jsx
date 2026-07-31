import {
  getStoreOrderStatusMeta,
  getDeliveryLabel,
  getPaymentLabel,
  isDigitalPayment,
  formatOrderDate,
} from '../../utils/storeOrderLabels';

function OrderItemRow({ item }) {
  const subtotal = (item.price || 0) * (item.quantity || 0);
  return (
    <div className="store-order-item">
      <div className="store-order-item__media">
        {item.image ? (
          <img src={item.image} alt="" />
        ) : (
          <div className="store-order-item__placeholder">📦</div>
        )}
      </div>
      <div className="store-order-item__body">
        <p className="store-order-item__name">{item.name}</p>
        <p className="store-order-item__meta">
          {item.price} ₪ × {item.quantity}
        </p>
      </div>
      <strong className="store-order-item__total">{subtotal.toFixed(2)} ₪</strong>
    </div>
  );
}

export default function StoreOrderCard({
  order,
  busy = false,
  onConfirm,
  onReject,
  onWhatsapp,
  onChat,
}) {
  const statusMeta = getStoreOrderStatusMeta(order.status);
  const items = order.items || [];
  const productsSubtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
  const transfer = order.transferInformation || {};
  const isPending = order.status === 'pending';
  const showActions = isPending;

  return (
    <article className={`store-order-card store-order-card--${statusMeta.tone}`}>
      <header className="store-order-card__head">
        <div>
          <span className="store-order-card__label">رقم الطلب</span>
          <h3>{order.orderNumber || order._id?.slice(-6)?.toUpperCase()}</h3>
          <p className="store-order-card__date">{formatOrderDate(order.createdAt)}</p>
        </div>
        <span className={`store-order-card__badge store-order-card__badge--${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </header>

      <section className="store-order-card__section">
        <h4>بيانات المشتري</h4>
        <div className="store-order-card__grid">
          <div><span>الاسم</span><strong>{order.customer?.name || '—'}</strong></div>
          <div><span>الهاتف</span><strong dir="ltr">{order.customer?.phone || '—'}</strong></div>
        </div>
      </section>

      <section className="store-order-card__section">
        <h4>طريقة الاستلام</h4>
        <p className="store-order-card__text">{getDeliveryLabel(order.deliveryMethod)}</p>
        {order.deliveryAddress && (
          <p className="store-order-card__address">{order.deliveryAddress}</p>
        )}
      </section>

      <section className="store-order-card__section">
        <h4>المنتجات</h4>
        <div className="store-order-card__items">
          {items.map((item) => (
            <OrderItemRow key={`${item.item}-${item.name}`} item={item} />
          ))}
        </div>
        <div className="store-order-card__totals">
          <div><span>مجموع المنتجات</span><strong>{productsSubtotal.toFixed(2)} ₪</strong></div>
          <div className="store-order-card__totals-final">
            <span>الإجمالي النهائي</span>
            <strong>{order.total} ₪</strong>
          </div>
        </div>
      </section>

      <section className="store-order-card__section store-order-card__section--payment">
        <h4>معلومات الدفع</h4>
        <p className="store-order-card__text">
          <span>طريقة الدفع:</span>
          <strong>{getPaymentLabel(order.paymentMethod)}</strong>
        </p>

        {isDigitalPayment(order.paymentMethod) && (
          <div className="store-order-card__payment-details">
            {order.paymentProof && (
              <div className="store-order-card__receipt">
                <span>إيصال التحويل</span>
                <a href={order.paymentProof} target="_blank" rel="noreferrer">
                  <img src={order.paymentProof} alt="إيصال التحويل" />
                </a>
              </div>
            )}
            {transfer.senderName && (
              <p><span>اسم المحول:</span> {transfer.senderName}</p>
            )}
            {transfer.contactNumber && (
              <p><span>رقم التواصل:</span> <span dir="ltr">{transfer.contactNumber}</span></p>
            )}
            {transfer.referenceNumber && (
              <p><span>رقم التحويل:</span> <span dir="ltr">{transfer.referenceNumber}</span></p>
            )}
            {transfer.note && (
              <p><span>ملاحظة:</span> {transfer.note}</p>
            )}
          </div>
        )}

        {order.customerNotes && (
          <p className="store-order-card__notes">
            <span>ملاحظات الزبون:</span> {order.customerNotes}
          </p>
        )}
      </section>

      {order.verificationCode && (
        <div className="store-order-card__code">
          🔐 رمز التحقق: <strong>{order.verificationCode}</strong>
        </div>
      )}

      <footer className="store-order-card__foot">
        {showActions && (
          <div className="store-order-card__main-actions">
            <button
              type="button"
              className="store-order-card__confirm"
              disabled={busy}
              onClick={() => onConfirm(order)}
            >
              {busy ? 'جارٍ التأكيد...' : 'تأكيد الطلب'}
            </button>
            <button
              type="button"
              className="store-order-card__reject"
              disabled={busy}
              onClick={() => onReject(order)}
            >
              رفض الطلب
            </button>
          </div>
        )}

        <div className="store-order-card__secondary-actions">
          {order.customer?.phone && (
            <button type="button" className="store-order-card__wa" onClick={() => onWhatsapp(order)}>
              📱 واتساب
            </button>
          )}
          <button type="button" className="store-order-card__chat" onClick={() => onChat(order)}>
            💬 دردشة
          </button>
        </div>
      </footer>
    </article>
  );
}
