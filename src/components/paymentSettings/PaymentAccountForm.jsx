import { useEffect, useState } from 'react';
import ImagePicker from '../ImagePicker';
import { ACCOUNT_KINDS } from '../../utils/paymentMethodConstants';

const EMPTY = {
  type: 'bank_palestine',
  accountName: '',
  accountNumber: '',
  accountType: 'merchant',
  barcodeImage: '',
  isActive: true,
};

export default function PaymentAccountForm({
  open,
  initial,
  fixedType = null,
  saving = false,
  onClose,
  onSubmit,
  onError,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      ...initial,
      type: fixedType || initial?.type || EMPTY.type,
      accountType: initial?.accountType || 'merchant',
      barcodeImage: initial?.barcodeImage || initial?.qrCodeUrl || '',
    });
  }, [open, initial, fixedType]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type: fixedType || form.type,
      accountName: form.accountName.trim(),
      accountNumber: form.accountNumber.trim(),
      accountType: form.accountType || 'merchant',
      barcodeImage: form.barcodeImage,
      isActive: form.isActive,
    });
  };

  return (
    <div className="payment-modal" role="dialog" aria-modal="true" dir="rtl">
      <button type="button" className="payment-modal__backdrop" aria-label="إغلاق" onClick={onClose} />
      <div className="payment-modal__sheet">
        <h3>{initial?._id ? 'تعديل حساب الدفع' : 'إضافة حساب دفع'}</h3>

        <form onSubmit={handleSubmit} className="payment-account-form">
          <div className="form-group">
            <label htmlFor="pay-owner">اسم صاحب الحساب *</label>
            <input
              id="pay-owner"
              value={form.accountName}
              onChange={(e) => setForm((prev) => ({ ...prev, accountName: e.target.value }))}
              required
              placeholder="الاسم كما يظهر في الحساب"
            />
          </div>

          <div className="form-group">
            <label htmlFor="pay-number">رقم الحساب / التحويل *</label>
            <input
              id="pay-number"
              value={form.accountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              required
              dir="ltr"
              placeholder="1234567890"
            />
          </div>

          <div className="form-group">
            <span className="field-label">نوع الحساب *</span>
            <div className="payment-account-kind" role="radiogroup" aria-label="نوع الحساب">
              {ACCOUNT_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  className={`payment-account-kind__btn${form.accountType === kind.id ? ' is-active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, accountType: kind.id }))}
                  aria-pressed={form.accountType === kind.id}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          </div>

          <ImagePicker
            label="صورة QR (اختياري)"
            value={form.barcodeImage}
            onChange={(url) => setForm((prev) => ({ ...prev, barcodeImage: url }))}
            onError={onError}
          />

          <label className="payment-account-form__active">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span>تفعيل هذا الحساب فور الحفظ</span>
          </label>
          <p className="payment-account-form__hint">
            عند التفعيل، يُوقف تلقائياً أي حساب نشط آخر من نفس النوع.
          </p>

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ الحساب'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
