import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import "../styles/auth.css";
import { requestPasswordReset, resetPassword } from "../services/password.service";
import { validatePasswordReset } from "../utils/passwordValidation";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  const sendCode = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return alert("أدخل البريد أو الهاتف");
    setLoading(true);
    try {
      const { data } = await requestPasswordReset(identifier.trim());
      if (data.devCode) setDevCode(data.devCode);
      alert(data.message || "تم إرسال الرمز");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const err = validatePasswordReset({ code, newPassword, confirmPassword });
    if (err) return alert(err);
    setLoading(true);
    try {
      const { data } = await resetPassword({
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
        confirmPassword,
      });
      alert(data.message || "تم تعيين كلمة المرور");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر إعادة التعيين");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={step === 1 ? sendCode : handleReset}>
        <h2>نسيت كلمة المرور</h2>
        <p>{step === 1 ? "أدخل بيانات حسابك لإرسال رمز OTP" : "أدخل الرمز وكلمة المرور الجديدة"}</p>

        {step === 1 ? (
          <div className="input-group">
            <label>البريد أو الهاتف</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0592222222 أو email@..." required />
          </div>
        ) : (
          <>
            {devCode && <p className="hint-box">رمز التطوير: {devCode}</p>}
            <div className="input-group">
              <label>رمز OTP</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            </div>
            <div className="input-group">
              <label>كلمة المرور الجديدة</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="input-group">
              <label>تأكيد كلمة المرور</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
            </div>
          </>
        )}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "جاري المعالجة..." : step === 1 ? "إرسال الرمز" : "تعيين كلمة المرور"}
        </button>

        <p className="auth-link-row">
          <Link to="/login">العودة لتسجيل الدخول</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
