import "./AuthLayout.css";
import { BRAND_LOGO_128, BRAND_NAME, BRAND_TAGLINE } from "../utils/brandAssets";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-container">
      <div className="auth-brand">
        <div className="brand-content">
          <img
            src={BRAND_LOGO_128}
            alt={BRAND_NAME}
            width={96}
            height={96}
            className="auth-brand__logo"
          />
          <h1>{BRAND_NAME}</h1>
          <p className="auth-brand__tagline">{BRAND_TAGLINE}</p>

          <p>
            منصة تربط المستودعات والمتاجر بطريقة احترافية وآمنة لإدارة
            المنتجات والعروض والتواصل التجاري.
          </p>
        </div>
      </div>

      <div className="auth-form-side">
        {children}
      </div>
    </div>
  );
}
