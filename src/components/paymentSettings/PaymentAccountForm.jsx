import { useEffect, useState } from 'react';
import ImagePicker from '../ImagePicker';

const EMPTY = {
  type: 'bank_palestine',
  accountName: '',
  accountNumber: '',
  iban: '',
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
    });
  }, [open, initial, fixedType]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type: fixedType || form.type,
      accountName: form.accountName.trim(),
      accountNumber: form.accountNumber.trim(),
      iban: form.iban.trim(),
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
          {!fixedType && (
            <div className="form-group">
              <label htmlFor="pay-type">نوع الدفع</label>
              <select
                id="pay-type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                required
              >
                <option value="bank_palestine">بنك فلسطين</option>
                <option value="palpay">PalPay</option>
                <option value="jawwal_pay">Jawwal Pay</option>
              </select>
            </div>
          )}

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
            <label htmlFor="pay-iban">IBAN (اختياري)</label>
            <input
              id="pay-iban"
              value={form.iban}
              onChange={(e) => setForm((prev) => ({ ...prev, iban: e.target.value }))}
              dir="ltr"
              placeholder="PS00..."
            />
          </div>

          <ImagePicker
            label="صورة QR / الباركود"
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
            عند التفعيل، سيتم إيقاف الحسابات الأخرى من نفس النوع تلقائياً.
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
