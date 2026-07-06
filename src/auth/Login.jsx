import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import "../styles/auth.css";

import { login } from "../services/auth.service";
import { setAuth } from "../utils/auth";
import { useEffect } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  useEffect(() => {
  const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return;

    if (user.role === "supplier") {
      navigate("/supplier", { replace: true });
    } else if (user.role === "store") {
      navigate("/store", { replace: true });
    }
}, [navigate]);

  // 🔥 NEW: نوع الحساب
  // إذا لاحقًا تريد زر اختيار نضيفه بدون تغيير الشكل

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.identifier || !form.password) {
      alert("يرجى تعبئة جميع الحقول");
      return;
    }

    try {
      const res = await login({
        identifier: form.identifier,
          password: form.password,
          appType: "business",
              });

      const data = res.data;

      setAuth(data);

      const role = data.user.role;

      // 🔥 التوجيه حسب الدور
      if (role === "supplier") {
          navigate("/supplier", { replace: true });
        } else if (role === "store") {
          navigate("/store", { replace: true });
        } 

    } catch (err) {
      alert(err.response?.data?.message || "خطأ في تسجيل الدخول");
    }
  };
  

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>تسجيل الدخول</h2>
        <p>ادخل رقم الهاتف أو كود التفعيل وكلمة المرور</p>

        <div className="input-group">
          <label>رقم الهاتف أو كود التفعيل</label>
          <input
            name="identifier"
            onChange={handleChange}
            placeholder="0592222222 أو TR-XXXX"
          />
        </div>

        <div className="input-group">
          <label>كلمة المرور</label>

          <div className="password-box">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              onChange={handleChange}
              placeholder="••••••••"
            />

            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="switch-link" style={{ textAlign: 'left', marginTop: 8 }}>
          <Link to="/forgot-password">نسيت كلمة المرور؟</Link>
        </div>

        <button type="submit" className="primary-btn">
          دخول
        </button>

        <div className="switch-link">
          ليس لديك حساب؟ <a href="/register">إنشاء حساب</a>
        </div>
      </form>
    </AuthLayout>
  );
}