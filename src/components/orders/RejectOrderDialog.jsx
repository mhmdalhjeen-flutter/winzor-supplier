import { useEffect, useState } from 'react';

export default function RejectOrderDialog({ open, onClose, onConfirm, loading = false }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  return (
    <div className="store-order-dialog-overlay" onClick={onClose} role="presentation">
      <div className="store-order-dialog" onClick={(e) => e.stopPropagation()} dir="rtl" role="dialog" aria-modal="true">
        <h3>رفض الطلب</h3>
        <p className="store-order-dialog__hint">
          يمكنك إدخال سبب الرفض (اختياري). سيصل إشعار للزبون مع السبب إن وُجد.
        </p>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثال: العنصر غير متوفر حالياً..."
          autoFocus
        />
        <div className="store-order-dialog__actions">
          <button type="button" className="store-order-dialog__secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button type="button" className="store-order-dialog__danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
}
