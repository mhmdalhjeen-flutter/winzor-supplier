export default function LoginRateLimitBanner({
  isRateLimited,
  formattedRemaining,
  showRetryReady = false,
}) {
  if (isRateLimited) {
    return (
      <div className="rate-limit-box" role="status" aria-live="polite">
        <p className="rate-limit-box__title">محاولات تسجيل دخول كثيرة</p>
        <p className="rate-limit-box__text">
          لأمان حسابك، يرجى الانتظار قبل إعادة المحاولة.
        </p>
        <p className="rate-limit-box__label">يمكنك المحاولة مرة أخرى بعد:</p>
        <p
          className="rate-limit-box__timer"
          aria-label={`الوقت المتبقي ${formattedRemaining}`}
        >
          {formattedRemaining}
        </p>
      </div>
    );
  }

  if (showRetryReady) {
    return (
      <div className="rate-limit-ready" role="status">
        يمكنك المحاولة الآن
      </div>
    );
  }

  return null;
}
