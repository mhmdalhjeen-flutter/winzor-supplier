import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import "../styles/auth.css";

import { login } from "../services/auth.service";
import { setAuth } from "../utils/auth";
import { completePendingPwaAction } from "../pwa/pwaShortcutActions";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return;

    if (completePendingPwaAction(navigate, user.role)) return;

    if (user.role === "supplier") {
      navigate("/supplier", { replace: true });
    } else if (user.role === "store") {
      navigate("/store", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.identifier || !form.password) {
      setError("يرجى تعبئة جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        identifier: form.identifier,
          password: form.password,
          appType: "business",
              });

      const data = res.data;

      setAuth(data);

      const role = data.user.role;

      if (completePendingPwaAction(navigate, role)) return;

      if (role === "supplier") {
          navigate("/supplier", { replace: true });
        } else if (role === "store") {
          navigate("/store", { replace: true });
        } 

    } catch (err) {
      const message = err.response?.data?.message
        || (err.code === "ERR_NETWORK" ? "تعذّر الاتصال بالخادم. تحقق من الاتصال أو حاول لاحقاً." : "خطأ في تسجيل الدخول");
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>تسجيل الدخول</h2>
        <p>ادخل رقم الهاتف أو كود التفعيل وكلمة المرور</p>

        {error && (
          <div className="hint-box" style={{ background: "#fef2f2", color: "#991b1b" }} role="alert">
            {error}
          </div>
        )}

        <div className="input-group">
          <label>رقم الهاتف أو كود التفعيل</label>
          <input
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            placeholder="0592222222 أو TR-XXXX"
            disabled={loading}
            required
          />
        </div>

        <div className="input-group">
          <label>كلمة المرور</label>

          <div className="password-box">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              required
            />

            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="switch-link" style={{ textAlign: 'left', marginTop: 8 }}>
          <Link to="/forgot-password">نسيت كلمة المرور؟</Link>
        </div>

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول"}
        </button>

        <div className="switch-link">
          ليس لديك حساب؟ <Link to="/register">إنشاء حساب</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
