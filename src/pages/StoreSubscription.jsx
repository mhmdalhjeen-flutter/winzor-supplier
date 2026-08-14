import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ChevronLeft, FileSpreadsheet } from 'lucide-react';
import ImagePicker from '../components/ImagePicker';
import {
  getMySubscription,
  getSubscriptionPaymentMethods,
  submitSubscriptionPayment,
  exportSubscriptionPaperCodes,
} from '../services/subscription.service';
import { paymentTypeLabel } from '../utils/subscriptionLabels';
import { getStoredUser } from '../utils/safeStorage';
import { queryKeys } from '../lib/queryClient';
import '../styles/storeSubscription.css';

const EMPTY_TRANSFER = {
  transferName: '',
  transferPhone: '',
  transferNumber: '',
  paymentNotes: '',
};

export default function StoreSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const ownerName = user?.name || 'صاحب المحل';

  const [step, setStep] = useState('welcome');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentMode, setPaymentMode] = useState('receipt');
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER);
  const [receipt, setReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: queryKeys.storeSubscription,
    queryFn: async () => {
      const { data } = await getMySubscription();
      return data;
    },
    staleTime: 20 * 1000,
  });

  const { data: methodsData } = useQuery({
    queryKey: queryKeys.subscriptionPaymentMethods,
    queryFn: async () => {
      const { data } = await getSubscriptionPaymentMethods();
      return data;
    },
    enabled: step === 'methods' || step === 'pay',
    staleTime: 60 * 1000,
  });

  const methods = methodsData?.methods || [];

  useEffect(() => {
    if (!subscription?.paymentRejected || !methods.length) return;
    const pm = subscription.payment?.paymentMethod || subscription.period?.paymentMethod;
    if (!pm) return;
    const found = methods.find((m) => m.type === pm);
    if (found) setSelectedMethod(found);
  }, [subscription, methods]);

  useEffect(() => {
    if (!subscription) return;
    const payment = subscription.payment || {};
    const ti = payment.transferInformation || {};
    setTransfer({
      transferName: ti.senderName || '',
      transferPhone: ti.contactNumber || '',
      transferNumber: ti.referenceNumber || '',
      paymentNotes: ti.note || '',
    });
    if (payment.paymentProof) {
      setReceipt(payment.paymentProof);
      setPaymentMode('receipt');
    } else if (ti.senderName || ti.referenceNumber) {
      setPaymentMode('transfer');
    }

    if (subscription.paymentRejected) {
      setStep('pay');
      if (payment.paymentMethod) {
        setSelectedMethod({ type: payment.paymentMethod });
      }
    } else if (subscription.awaitingPayment || (subscription.needsPayment && !subscription.paymentRejected)) {
      setStep('welcome');
    } else if (['active', 'exempted'].includes(subscription.status)) {
      setStep('done');
    } else if (subscription.paymentPending) {
      setStep('pending');
    }
  }, [subscription]);

  const showToast = (text, isError = false) => {
    setToast({ text, isError });
    window.setTimeout(() => setToast({ text: '', isError: false }), 4000);
  };

  const canExport = useMemo(
    () => ['active', 'exempted'].includes(subscription?.status),
    [subscription?.status],
  );

  const handleSubmit = async () => {
    if (!selectedMethod?.type) {
      showToast('اختر طريقة الدفع', true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        paymentMethod: selectedMethod.type,
        transferName: transfer.transferName,
        transferPhone: transfer.transferPhone,
        transferNumber: transfer.transferNumber,
        paymentNotes: transfer.paymentNotes,
        transferInformation: {
          senderName: transfer.transferName,
          contactNumber: transfer.transferPhone,
          referenceNumber: transfer.transferNumber,
          note: transfer.paymentNotes,
        },
      };
      if (paymentMode === 'receipt' && receipt) {
        payload.paymentProof = receipt;
        payload.paymentProofImage = receipt;
      }

      await submitSubscriptionPayment(payload);
      await refetch();
      queryClient.invalidateQueries({ queryKey: queryKeys.storeSubscription });
      showToast('تم إرسال الدفع — قيد المراجعة');
      setStep('pending');
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر إرسال الدفع', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportSubscriptionPaperCodes();
      const storeName = subscription?.storeName || 'store';
      const safeName = String(storeName).replace(/[^\w\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-') || 'store';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-gift-codes.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر التصدير', true);
    }
  };

  if (isLoading) {
    return (
      <div className="store-sub-page" dir="rtl">
        <div className="store-sub-loading"><Loader2 className="spin" size={28} /></div>
      </div>
    );
  }

  return (
    <div className="store-sub-page" dir="rtl">
      <Link to={baseRoute} className="store-sub-back">
        <ChevronLeft size={16} /> الرئيسية
      </Link>

      {toast.text && (
        <div className={`store-sub-toast${toast.isError ? ' is-error' : ''}`}>{toast.text}</div>
      )}

      {step === 'welcome' && (
        <section className="store-sub-card store-sub-card--hero">
          <p className="store-sub-greeting">مرحباً {ownerName}</p>
          <h1>شهر جديد باشتراك جديد</h1>
          <p className="store-sub-lead">جدّد اشتراك متجرك للحصول على كروت الشهر الحالي.</p>
          <button type="button" className="store-sub-primary-btn" onClick={() => setStep('methods')}>
            تجديد الاشتراك
          </button>
        </section>
      )}

      {step === 'methods' && (
        <section className="store-sub-card">
          <h2>اختر طريقة الدفع</h2>
          <div className="store-sub-methods">
            {methods.length === 0 ? (
              <p className="store-sub-muted">لا توجد طرق دفع متاحة حالياً — تواصل مع الإدارة.</p>
            ) : (
              methods.map((method) => (
                <button
                  key={method._id || method.type}
                  type="button"
                  className="store-sub-method-btn"
                  onClick={() => {
                    setSelectedMethod(method);
                    setStep('pay');
                  }}
                >
                  <span>{paymentTypeLabel(method.type)}</span>
                  <small>{method.accountName}</small>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {step === 'pay' && selectedMethod && (
        <section className="store-sub-card">
          <h2>{paymentTypeLabel(selectedMethod.type)}</h2>
          <div className="store-sub-pay-details">
            <p><strong>اسم الحساب:</strong> {selectedMethod.accountName}</p>
            <p><strong>رقم الحساب:</strong> <span dir="ltr">{selectedMethod.accountNumber}</span></p>
            {selectedMethod.iban && <p><strong>IBAN:</strong> <span dir="ltr">{selectedMethod.iban}</span></p>}
            {selectedMethod.barcodeImage && (
              <img src={selectedMethod.barcodeImage} alt="QR" className="store-sub-qr" />
            )}
          </div>

          <div className="store-sub-mode-tabs">
            <button
              type="button"
              className={paymentMode === 'receipt' ? 'is-active' : ''}
              onClick={() => setPaymentMode('receipt')}
            >
              رفع إشعار
            </button>
            <button
              type="button"
              className={paymentMode === 'transfer' ? 'is-active' : ''}
              onClick={() => setPaymentMode('transfer')}
            >
              بيانات التحويل
            </button>
          </div>

          {paymentMode === 'receipt' ? (
            <ImagePicker
              label="صورة إشعار الدفع"
              value={receipt}
              onChange={setReceipt}
            />
          ) : (
            <div className="store-sub-form">
              <label>
                اسم المرسل
                <input
                  value={transfer.transferName}
                  onChange={(e) => setTransfer((p) => ({ ...p, transferName: e.target.value }))}
                />
              </label>
              <label>
                رقم التواصل
                <input
                  dir="ltr"
                  value={transfer.transferPhone}
                  onChange={(e) => setTransfer((p) => ({ ...p, transferPhone: e.target.value }))}
                />
              </label>
              <label>
                رقم المرجع / العملية
                <input
                  dir="ltr"
                  value={transfer.transferNumber}
                  onChange={(e) => setTransfer((p) => ({ ...p, transferNumber: e.target.value }))}
                />
              </label>
              <label>
                ملاحظات (اختياري)
                <textarea
                  rows={2}
                  value={transfer.paymentNotes}
                  onChange={(e) => setTransfer((p) => ({ ...p, paymentNotes: e.target.value }))}
                />
              </label>
            </div>
          )}

          <button
            type="button"
            className="store-sub-primary-btn"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'جاري الإرسال...' : 'إتمام الدفع'}
          </button>
        </section>
      )}

      {step === 'pending' && (
        <section className="store-sub-card store-sub-card--pending">
          <h2>الدفع قيد المراجعة</h2>
          <p>تم استلام بيانات الدفع. يمكنك متابعة استخدام المتجر — سنُعلمك عند الاعتماد.</p>
          <button type="button" className="store-sub-secondary-btn" onClick={() => navigate(baseRoute)}>
            العودة للرئيسية
          </button>
        </section>
      )}

      {step === 'done' && (
        <section className="store-sub-card store-sub-card--success">
          <h2>الاشتراك مفعّل</h2>
          <p>تم تفعيل اشتراك هذا الشهر وإصدار الكروت حسب الإعدادات.</p>
          {canExport && (
            <button type="button" className="store-sub-secondary-btn" onClick={handleExport}>
              <FileSpreadsheet size={16} /> تصدير الكروت الورقية
            </button>
          )}
          <button type="button" className="store-sub-primary-btn" onClick={() => navigate(baseRoute)}>
            العودة للرئيسية
          </button>
        </section>
      )}
    </div>
  );
}
