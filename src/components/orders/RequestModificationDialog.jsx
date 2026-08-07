import { useEffect, useState } from 'react';

const REASONS = [
  {
    id: 'area_too_far',
    label: 'المنطقة بعيدة',
    hint: 'سيُطلب من الزبون تغيير طريقة التوصيل.',
  },
  {
    id: 'items_unavailable',
    label: 'طلب غير متوفر',
    hint: 'اختر المنتجات غير المتوفرة لإرسالها للتعديل.',
  },
];

function getItemLabel(item, index) {
  return item?.name || item?.productName || `منتج ${index + 1}`;
}

export default function RequestModificationDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  items = [],
  allowAreaTooFar = false,
}) {
  const [reason, setReason] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  useEffect(() => {
    if (open) {
      setReason('');
      setSelectedIndexes([]);
    }
  }, [open]);

  if (!open) return null;

  const toggleIndex = (idx) => {
    setSelectedIndexes((prev) => (
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    ));
  };

  const canSubmit = reason === 'area_too_far'
    || (reason === 'items_unavailable' && selectedIndexes.length > 0);

  const handleConfirm = () => {
    if (!canSubmit || loading) return;
    onConfirm({
      reason,
      unavailableItemIndexes: reason === 'items_unavailable' ? selectedIndexes : [],
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
        <h3>طلب تعديل</h3>
        <p className="store-order-dialog__hint">
          اختر سبب إرجاع الطلب للزبون للتعديل.
        </p>

        <div className="mod-reason-list">
          {REASONS.filter((r) => r.id !== 'area_too_far' || allowAreaTooFar).map((r) => (
            <button
              key={r.id}
              type="button"
              className={`mod-reason-option${reason === r.id ? ' is-selected' : ''}`}
              onClick={() => setReason(r.id)}
            >
              <span className="mod-reason-option__radio" aria-hidden />
              <span className="mod-reason-option__text">
                <strong>{r.label}</strong>
                <small>{r.hint}</small>
              </span>
            </button>
          ))}
        </div>

        {reason === 'items_unavailable' && (
          <div className="mod-items-picker">
            <p className="store-order-dialog__hint">حدد المنتجات غير المتوفرة:</p>
            <ul className="mod-items-picker__list">
              {(items || []).map((item, idx) => {
                const checked = selectedIndexes.includes(idx);
                return (
                  <li key={`${item.item || item.productId || idx}-${idx}`}>
                    <label className={`mod-items-picker__row${checked ? ' is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIndex(idx)}
                      />
                      <span className="mod-items-picker__name">{getItemLabel(item, idx)}</span>
                      {item.quantity != null && (
                        <span className="mod-items-picker__qty">×{item.quantity}</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
            {loading ? 'جارٍ الإرسال...' : 'إرسال للتعديل'}
          </button>
        </div>
      </div>
    </div>
  );
}
