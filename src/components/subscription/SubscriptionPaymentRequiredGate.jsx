import { logout as authLogout } from '../../utils/auth';

export default function SubscriptionPaymentRequiredGate({ navigate, baseRoute, monthKey }) {
  const handleLogout = () => {
    authLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="subscription-gate" dir="rtl">
      <div className="subscription-gate__card">
        <span className="subscription-gate__icon" aria-hidden>💳</span>
        <h2>مطلوب دفع الاشتراك</h2>
        <p>
          {monthKey
            ? `يرجى إتمام دفع اشتراك ${monthKey} للوصول إلى لوحة المتجر.`
            : 'يرجى إتمام دفع الاشتراك للوصول إلى لوحة المتجر.'}
        </p>
        <div className="subscription-gate__actions">
          <button
            type="button"
            className="subscription-gate__btn subscription-gate__btn--primary"
            onClick={() => navigate(`${baseRoute}/subscription`)}
          >
            الذهاب إلى صفحة الاشتراك
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
