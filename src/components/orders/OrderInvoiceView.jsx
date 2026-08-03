import { formatOrderLineMeta, purchaseMethodLabel } from '../../utils/purchaseMode';
import {
  getDeliveryLabel,
  getPaymentLabel,
  isDigitalPayment,
  formatOrderDate,
  getCustomerDisplayName,
  getCustomerDisplayPhone,
  getOrderDisplayNumber,
  getConfirmationNumber,
  getPaymentProofUrl,
} from '../../utils/storeOrderLabels';
function InvoiceRow({ label, value, ltr = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="order-invoice__row">
      <span className="order-invoice__label">{label}</span>
      <span className="order-invoice__value" dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  );
}

function InvoiceItemRow({ item }) {
  const purchaseMethod = item.purchaseMethod || 'quantity';
  const subtotal = item.subtotal ?? (purchaseMethod === 'price'
    ? (item.requestedAmount ?? item.price ?? 0)
    : (item.price ?? 0) * (item.quantity ?? 0));
  const name = item.name || item.productName || '—';

  return (
    <div className="order-invoice__item">
      <div className="order-invoice__item-info">
        <span className="order-invoice__item-name">{name}</span>
        <span className="order-invoice__item-meta">
          {formatOrderLineMeta(item)}
        </span>
        <span className="order-invoice__item-method">{purchaseMethodLabel(purchaseMethod)}</span>
      </div>
      <span className="order-invoice__item-subtotal">{subtotal.toFixed(2)} ₪</span>
    </div>
  );
}

export default function OrderInvoiceView({ order }) {
  const items = order.items || [];
  const productsSubtotal = items.reduce((sum, i) => {
    if (typeof i.subtotal === 'number') return sum + i.subtotal;
    if ((i.purchaseMethod || 'quantity') === 'price') {
      return sum + (i.requestedAmount ?? i.price ?? 0);
    }
    return sum + (i.price || 0) * (i.quantity || 0);
  }, 0);
  const total = order.total ?? order.totalAmount ?? productsSubtotal;
  const transfer = order.transferInformation || {};
  const paymentProof = getPaymentProofUrl(order);
  const paymentMethod = order.paymentMethod || '';

  return (
    <div className="order-invoice" dir="rtl">
      <section className="order-invoice__section">
        <h3 className="order-invoice__section-title">بيانات الزبون</h3>
        <InvoiceRow label="الاسم" value={getCustomerDisplayName(order)} />
        <InvoiceRow label="الهاتف" value={getCustomerDisplayPhone(order)} ltr />
      </section>

      <section className="order-invoice__section">
        <h3 className="order-invoice__section-title">بيانات الطلب</h3>
        <InvoiceRow label="تاريخ الطلب" value={formatOrderDate(order.createdAt)} />
        <InvoiceRow label="رقم الطلب" value={getOrderDisplayNumber(order)} />
        <InvoiceRow label="رقم التأكيد" value={getConfirmationNumber(order)} />
      </section>

      <section className="order-invoice__section">
        <h3 className="order-invoice__section-title">العناصر</h3>
        <div className="order-invoice__items">
          {items.map((item, idx) => (
            <InvoiceItemRow key={`${item.item || item.productId || idx}-${item.name}`} item={item} />
          ))}
        </div>
        <div className="order-invoice__totals">
          <div className="order-invoice__total-row">
            <span>المجموع الفرعي</span>
            <strong>{productsSubtotal.toFixed(2)} ₪</strong>
          </div>
          <div className="order-invoice__total-row order-invoice__total-row--final">
            <span>الإجمالي النهائي</span>
            <strong>{Number(total).toFixed(2)} ₪</strong>
          </div>
        </div>
      </section>

      <section className="order-invoice__section">
        <h3 className="order-invoice__section-title">معلومات التوصيل</h3>
        <InvoiceRow label="طريقة التوصيل" value={getDeliveryLabel(order.deliveryMethod)} />
        <InvoiceRow label="العنوان" value={order.deliveryAddress} />
        <InvoiceRow label="ملاحظات إضافية" value={order.deliveryNotes || order.customerNotes} />
      </section>

      <section className="order-invoice__section order-invoice__section--payment">
        <h3 className="order-invoice__section-title">معلومات الدفع</h3>
        <div className="order-invoice__payment-panel">
          <InvoiceRow label="طريقة الدفع" value={getPaymentLabel(paymentMethod)} />
          <InvoiceRow label="ملاحظات الدفع" value={order.paymentNotes} />

          {isDigitalPayment(paymentMethod) && (
            <>
              {(transfer.senderName || order.transferName) && (
                <InvoiceRow label="اسم المحوّل" value={transfer.senderName || order.transferName} />
              )}
              {(transfer.contactNumber || order.transferPhone) && (
                <InvoiceRow label="رقم التواصل" value={transfer.contactNumber || order.transferPhone} ltr />
              )}
              {(transfer.referenceNumber || order.transferNumber) && (
                <InvoiceRow label="رقم التحويل" value={transfer.referenceNumber || order.transferNumber} ltr />
              )}
              {transfer.note && (
                <InvoiceRow label="ملاحظة التحويل" value={transfer.note} />
              )}
            </>
          )}

          {paymentProof && (
            <div className="order-invoice__proof">
              <span className="order-invoice__label">إثبات الدفع</span>
              <a href={paymentProof} target="_blank" rel="noreferrer" className="order-invoice__proof-link">
                <img src={paymentProof} alt="إثبات الدفع" />
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
