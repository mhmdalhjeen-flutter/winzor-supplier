import "./AuthLayout.css";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-container">
      <div className="auth-brand">
        <div className="brand-content">
          <h1>منصة التجار والمحال</h1>

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