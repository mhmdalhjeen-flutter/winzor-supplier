import { logout as authLogout } from "../utils/auth";

const MESSAGE = "يرجى تجديد الاشتراك للدخول إلى لوحة المتجر";

export default function SubscriptionExpiredGate({ navigate, baseRoute }) {
  const handleLogout = () => {
    authLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="subscription-expired" dir="rtl">
      <div className="subscription-expired__card">
        <span className="subscription-expired__icon" aria-hidden>❌</span>
        <h2>انتهى اشتراك المتجر</h2>
        <p>{MESSAGE}</p>
        <div className="subscription-expired__actions">
          <button type="button" className="subscription-expired__btn" onClick={() => navigate(`${baseRoute}/support`)}>
            🎧 تواصل مع الدعم
          </button>
          <button type="button" className="subscription-expired__btn subscription-expired__btn--ghost" onClick={handleLogout}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
