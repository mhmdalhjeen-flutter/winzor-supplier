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

function transferOperationLabel(tx, index, differenceCount) {
  if (tx.type === 'original') return 'التحويل الأصلي';
  if (tx.type === 'correction') return `تصحيح بيانات الدفع${differenceCount > 1 ? ` #${index}` : ''}`;
  return `تحويل فرق التعديل${differenceCount > 1 ? ` #${index}` : ''}`;
}

function buildTransferOperations(order) {
  const paymentMethod = order.paymentMethod || '';
  if (!isDigitalPayment(paymentMethod)) return [];

  const txs = Array.isArray(order.paymentTransactions) ? [...order.paymentTransactions] : [];
  if (!txs.length) {
    const transfer = order.transferInformation || {};
    const proof = getPaymentProofUrl(order);
    if (!proof && !transfer.senderName && !transfer.contactNumber && !transfer.referenceNumber) {
      return [];
    }
    return [{
      type: 'original',
      amount: order.originalTotal ?? order.total ?? 0,
      method: paymentMethod,
      proof,
      transferInformation: transfer,
      paidAt: order.createdAt,
      note: '',
    }];
  }

  return txs
    .slice()
    .sort((a, b) => new Date(a.paidAt || 0) - new Date(b.paidAt || 0));
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
  const paymentMethod = order.paymentMethod || '';
  const transferOperations = buildTransferOperations(order);
  const differenceOps = transferOperations.filter((tx) => tx.type === 'difference');

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
          {order.additionalPaymentAmount > 0 && (
            <InvoiceRow
              label="إجمالي فروقات التعديل"
              value={`${Number(order.additionalPaymentAmount).toFixed(2)} ₪`}
            />
          )}
          <InvoiceRow
            label="إجمالي المدفوع"
            value={`${Number(order.totalPaid ?? ((order.originalTotal || 0) + (order.additionalPaymentAmount || 0))).toFixed(2)} ₪`}
          />
        </div>
      </section>

      {Array.isArray(order.orderChangeHistory) && order.orderChangeHistory.length > 0 && (
        <section className="order-invoice__section">
          <h3 className="order-invoice__section-title">سجل التعديلات</h3>
          <ul className="order-invoice__history">
            {[...order.orderChangeHistory].reverse().map((entry, idx) => (
              <li key={`${entry.at}-${idx}`} className="order-invoice__history-item">
                <strong>{entry.note || entry.type}</strong>
                {entry.at && (
                  <span>{formatOrderDate(entry.at)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {transferOperations.length > 0 && (
        <section className="order-invoice__section order-invoice__section--transfers">
          <h3 className="order-invoice__section-title">بيانات التحويلات</h3>
          <p className="order-invoice__hint">سجل عمليات الدفع والتحويل — مرتبة زمنياً</p>
          <ol className="order-invoice__transfer-list">
            {transferOperations.map((tx, idx) => {
              const transfer = tx.transferInformation || {};
              const proof = tx.proof || '';
              let diffIndex = 0;
              if (tx.type === 'difference') {
                diffIndex = transferOperations
                  .slice(0, idx + 1)
                  .filter((entry) => entry.type === 'difference').length;
              }
              return (
                <li key={`transfer-${idx}-${tx.paidAt || tx.amount}`} className="order-invoice__transfer-card">
                  <h4>{transferOperationLabel(tx, diffIndex, differenceOps.length)}</h4>
                  <InvoiceRow label="المبلغ" value={`${Number(tx.amount || 0).toFixed(2)} ₪`} />
                  <InvoiceRow label="طريقة الدفع" value={getPaymentLabel(tx.method || paymentMethod)} />
                  {transfer.senderName && (
                    <InvoiceRow label="الاسم" value={transfer.senderName} />
                  )}
                  {transfer.contactNumber && (
                    <InvoiceRow label="رقم الحساب/الهاتف" value={transfer.contactNumber} ltr />
                  )}
                  {transfer.referenceNumber && (
                    <InvoiceRow label="رقم العملية" value={transfer.referenceNumber} ltr />
                  )}
                  {transfer.note && (
                    <InvoiceRow label="ملاحظة" value={transfer.note} />
                  )}
                  {tx.note && (
                    <InvoiceRow label="وصف العملية" value={tx.note} />
                  )}
                  {tx.paidAt && (
                    <InvoiceRow label="التاريخ" value={formatOrderDate(tx.paidAt)} />
                  )}
                  {proof && (
                    <div className="order-invoice__proof">
                      <span className="order-invoice__label">الإشعار/الإيصال</span>
                      <a href={proof} target="_blank" rel="noreferrer" className="order-invoice__proof-link">
                        <img src={proof} alt="إيصال التحويل" />
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
