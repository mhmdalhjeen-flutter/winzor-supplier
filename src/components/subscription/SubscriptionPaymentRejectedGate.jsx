import { logout as authLogout } from '../../utils/auth';

export default function SubscriptionPaymentRejectedGate({ navigate, baseRoute, rejectionReason }) {
  const handleLogout = () => {
    authLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="subscription-gate" dir="rtl">
      <div className="subscription-gate__card">
        <span className="subscription-gate__icon" aria-hidden>⚠️</span>
        <h2>بيانات الدفع غير صالحة</h2>
        <p>{rejectionReason || 'يرجى مراجعة بيانات الدفع وإعادة الإرسال لتفعيل الاشتراك.'}</p>
        <div className="subscription-gate__actions">
          <button
            type="button"
            className="subscription-gate__btn subscription-gate__btn--primary"
            onClick={() => navigate(`${baseRoute}/subscription`)}
          >
            مراجعة الدفع
          </button>
          <button type="button" className="subscription-gate__btn" onClick={() => navigate(`${baseRoute}/support`)}>
            🎧 تواصل مع الدعم
          </button>
          <button type="button" className="subscription-gate__btn subscription-gate__btn--ghost" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
