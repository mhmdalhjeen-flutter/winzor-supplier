import { Loader2 } from "lucide-react";
import { BRAND_LOGO_64, BRAND_NAME } from "../utils/brandAssets";
import "../styles/brand-loading.css";

/** علامة تحميل خفيفة — للتحميل الأول فقط (isLoading)، لا تظهر عند العودة من cache */
const LightLoadingHint = ({
  label = "جاري التحميل...",
  variant = "light",
  className = "",
  showLogo = true,
}) => {
  const textClass = variant === "dark" ? "brand-loading__text--dark" : "brand-loading__text";
  const iconClass = variant === "dark" ? "brand-loading__icon--dark" : "brand-loading__icon";

  return (
    <div className={`brand-loading ${className}`} aria-live="polite">
      {showLogo && (
        <img
          src={BRAND_LOGO_64}
          alt={BRAND_NAME}
          className="brand-loading__logo"
          width={48}
          height={48}
        />
      )}
      <div className="brand-loading__row">
        <Loader2 size={16} className={`brand-loading__spinner ${iconClass}`} />
        <span className={textClass}>{label}</span>
      </div>
    </div>
  );
};

export default LightLoadingHint;
