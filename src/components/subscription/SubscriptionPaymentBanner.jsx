import '../../styles/storeSubscription.css';

export default function SubscriptionPaymentBanner({ subscription, onReviewPayment }) {
  if (!subscription) return null;

  if (subscription.paymentPending) {
    return (
      <div className="sub-pay-banner sub-pay-banner--pending" dir="rtl">
        <span className="sub-pay-banner__dot" aria-hidden />
        <span>الدفع قيد المراجعة</span>
      </div>
    );
  }

  if (subscription.paymentRejected) {
    return (
      <div className="sub-pay-banner sub-pay-banner--rejected" dir="rtl">
        <div className="sub-pay-banner__text">
          <strong>تم رفض بيانات الدفع</strong>
          <span>{subscription.period?.rejectionReason || subscription.payment?.rejectionReason || 'يرجى مراجعة بيانات الدفع وإعادة الإرسال'}</span>
        </div>
        <button type="button" className="sub-pay-banner__btn" onClick={onReviewPayment}>
          مراجعة الدفع
        </button>
      </div>
    );
  }

  return null;
}
