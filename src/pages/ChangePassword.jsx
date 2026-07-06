import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import { changePassword } from "../services/password.service";
import { validatePasswordChange } from "../utils/passwordValidation";

export default function ChangePassword() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const base = user.role === "supplier" ? "/supplier" : "/store";
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validatePasswordChange(form);
    if (err) return alert(err);
    setLoading(true);
    try {
      const { data } = await changePassword(form);
      alert(data.message || "تم تغيير كلمة المرور");
      navigate(`${base}/profile`);
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <h2 className="title">🔐 تغيير كلمة المرور</h2>
      <div className="profile-container">
        <form className="profile-details-form" onSubmit={handleSubmit}>
          {[
            ["currentPassword", "كلمة المرور الحالية"],
            ["newPassword", "كلمة المرور الجديدة"],
            ["confirmPassword", "تأكيد كلمة المرور"],
          ].map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input
                type="password"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                minLength={6}
                required
              />
            </div>
          ))}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>إلغاء</button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
