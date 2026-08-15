import { useState } from 'react';
import { setSkipConfirmDisclaimer } from '../../utils/storeOrderLabels';

export default function ConfirmOrderDialog({ open, userId, onClose, onConfirm, loading = false }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    if (loading) return;
    if (dontShowAgain && userId) {
      setSkipConfirmDisclaimer(userId, true);
    }
    onConfirm();
  };

  return (
    <div className="store-order-dialog-overlay" onClick={onClose} role="presentation">
      <div className="store-order-dialog" onClick={(e) => e.stopPropagation()} dir="rtl" role="dialog" aria-modal="true">
        <h3>تأكيد الطلب</h3>
        <p className="store-order-dialog__message">
          المنصة غير مسؤولة عن التحويلات المالية، يرجى التأكد من بيانات التحويل قبل تأكيد الطلب.
        </p>
        <label className="store-order-dialog__check">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span>لا تظهر هذه الرسالة مرة أخرى</span>
        </label>
        <div className="store-order-dialog__actions">
          <button type="button" className="store-order-dialog__secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button type="button" className="store-order-dialog__primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'جارٍ...' : 'موافق'}
          </button>
        </div>
      </div>
    </div>
  );
}
