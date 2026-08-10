import { useEffect, useMemo, useState } from 'react';
import axios from '../../services/api';
import { getPaymentLabel, isDigitalPayment } from '../../utils/storeOrderLabels';

const FALLBACK_METHODS = [
  'cash_on_delivery',
  'seller_agreement',
  'bank_palestine',
  'palpay',
  'jawwal_pay',
];

function normalizeMethodId(method) {
  if (method === 'bank') return 'bank_palestine';
  return method || '';
}

export default function RequestPaymentModificationDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  order,
}) {
  const [storeNote, setStoreNote] = useState('');
  const [suggestedMethod, setSuggestedMethod] = useState('');
  const [enabledMethods, setEnabledMethods] = useState([]);

  const paymentMethod = order?.paymentMethod || '';
  const digital = isDigitalPayment(paymentMethod);
  const currentUiMethod = normalizeMethodId(paymentMethod);
  const storeId = order?.storeId || order?.store?._id || order?.store;

  useEffect(() => {
    if (!open) {
      setStoreNote('');
      setSuggestedMethod('');
      return;
    }
    if (!storeId) return;
    axios.get(`/stores/${storeId}/payment-methods/active`)
      .then((res) => {
        const list = res.data?.enabledPaymentMethods || [];
        setEnabledMethods(list.length ? list : FALLBACK_METHODS);
      })
      .catch(() => setEnabledMethods(FALLBACK_METHODS));
  }, [open, storeId]);

  const alternatives = useMemo(
    () => (enabledMethods.length ? enabledMethods : FALLBACK_METHODS)
      .map(normalizeMethodId)
      .filter((id) => id && id !== currentUiMethod),
    [enabledMethods, currentUiMethod],
  );

  if (!open) return null;

  const canSubmit = digital || Boolean(suggestedMethod);

  const handleConfirm = () => {
    if (!canSubmit || loading) return;
    if (digital) {
      onConfirm({
        reason: 'payment_data_review',
        storeNote: storeNote.trim(),
      });
      return;
    }
    onConfirm({
      reason: 'payment_method_change_suggested',
      suggestedPaymentMethod: suggestedMethod,
      storeNote: storeNote.trim(),
    });
  };

  return (
    <div className="store-order-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="store-order-dialog store-order-dialog--wide"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        role="dialog"
        aria-modal="true"
      >
        <h3>{digital ? 'مراجعة بيانات الدفع' : 'طلب تغيير طريقة الدفع'}</h3>

        {digital ? (
          <>
            <p className="store-order-dialog__hint">
              سيُطلب من الزبون مراجعة بيانات التحويل أو إعادة إرسالها — لا يمكن تغيير
              طريقة الدفع للطلبات الإلكترونية.
            </p>
            <p className="store-order-dialog__hint">
              طريقة الدفع الحالية:
              {' '}
              <strong>{getPaymentLabel(paymentMethod)}</strong>
            </p>
          </>
        ) : (
          <>
            <p className="store-order-dialog__hint">
              يمكنك اقتراح طريقة دفع بديلة. الزبون ليس ملزماً بقبول اقتراحك.
            </p>
            <div className="mod-items-picker">
              <p className="store-order-dialog__hint">طريقة الدفع الحالية</p>
              <strong>{getPaymentLabel(paymentMethod)}</strong>
              <p className="store-order-dialog__hint" style={{ marginTop: 12 }}>
                طريقة الدفع المقترحة
              </p>
              <select
                className="store-order-dialog__select"
                value={suggestedMethod}
                onChange={(e) => setSuggestedMethod(e.target.value)}
              >
                <option value="">اختر طريقة...</option>
                {alternatives.map((methodId) => (
                  <option key={methodId} value={methodId}>
                    {getPaymentLabel(methodId)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <label className="checkout-notes-field" style={{ marginTop: 16 }}>
          <span>ملاحظة للزبون (اختياري)</span>
          <textarea
            value={storeNote}
            onChange={(e) => setStoreNote(e.target.value)}
            rows={3}
            placeholder={digital
              ? 'مثال: لم تصل الحوالة — يرجى إعادة إرسال بيانات الدفع'
              : 'مثال: لم تصل الحوالة — يفضل استخدام هذه الطريقة'}
          />
        </label>

        <div className="store-order-dialog__actions">
          <button type="button" className="store-order-dialog__secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button
            type="button"
            className="store-order-dialog__primary"
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            {loading ? 'جارٍ الإرسال...' : 'إرسال للزبون'}
          </button>
        </div>
      </div>
    </div>
  );
}
