import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import "../styles/auth.css";
import { register } from "../services/auth.service";
import {
  getLocalPhoneError,
  getWhatsAppError,
  WHATSAPP_PLACEHOLDER,
  normalizeLocalPhone,
  normalizeWhatsApp,
} from "../utils/phoneValidation";
import PalestinianPhoneInput from "../components/PalestinianPhoneInput";
import HierarchySelect from "../components/HierarchySelect";
import { useRegionTree } from "../hooks/useRegionTree";
import { useCategoryTree } from "../hooks/useCategoryTree";

export default function Register() {
  const [type, setType] = useState("supplier");
  const [regionPath, setRegionPath] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [networkCategoryPath, setNetworkCategoryPath] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { tree: regionTree, loading: regionLoading, error: regionError, reload: reloadRegions } = useRegionTree();
  const { tree: categoryTree, loading: categoryLoading, error: categoryError, reload: reloadCategories } = useCategoryTree("store");

  const [form, setForm] = useState({
    name: "",
    storeName: "",
    phone: "",
    whatsapp: "",
    activationCodeSS: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!regionPath[0]) {
      return alert("اختر المنطقة — المستوى الأول إلزامي");
    }
    if (!categoryPath[0]) {
      return alert("اختر نوع المتجر — المستوى الأول إلزامي");
    }
    if (type === "supplier" && !networkCategoryPath[0]) {
      return alert("اختر تصنيفات المتاجر التي تتابعها — المستوى الأول إلزامي");
    }

    const phoneErr = getLocalPhoneError(form.phone);
    if (phoneErr) return alert(phoneErr);

    const whatsappErr = form.whatsapp.trim() ? getWhatsAppError(form.whatsapp) : null;
    if (whatsappErr) return alert(whatsappErr);

    setSubmitting(true);
    try {
      const res = await register({
        name: form.name,
        phone: normalizeLocalPhone(form.phone),
        whatsapp: form.whatsapp.trim() ? normalizeWhatsApp(form.whatsapp) : undefined,
        password: form.password,
        accountType: type,
        activationCodeSS: form.activationCodeSS,
        businessName: form.storeName,
        regionPath,
        categoryPath,
        networkCategoryPath: type === "supplier" ? networkCategoryPath : undefined,
      });

      alert("تم إنشاء الحساب بنجاح");
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.location.href = res.data.redirectTo;
    } catch (err) {
      alert(err.response?.data?.message || "خطأ في التسجيل");
    } finally {
      setSubmitting(false);
    }
  };

  const businessLabel = type === "supplier" ? "المستودع" : "المتجر";

  return (
    <AuthLayout>
      <form className="auth-card auth-card-wide" onSubmit={handleSubmit}>
        <h2>إنشاء حساب</h2>
        <p>اختر نوع الحساب، المنطقة، ونوع النشاط من نفس بيانات لوحة الأدمن</p>

        <div className="type-switch">
          <button
            type="button"
            className={type === "supplier" ? "active" : ""}
            onClick={() => setType("supplier")}
          >
            تاجر
          </button>
          <button
            type="button"
            className={type === "store" ? "active" : ""}
            onClick={() => setType("store")}
          >
            صاحب محل
          </button>
        </div>

        <div className="input-group">
          <label>الاسم</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>{type === "supplier" ? "اسم المستودع" : "اسم المتجر"}</label>
          <input name="storeName" value={form.storeName} onChange={handleChange} required />
        </div>

        <HierarchySelect
          label="📍 المكان"
          tree={regionTree}
          pathIds={regionPath}
          onChange={setRegionPath}
          loading={regionLoading}
          error={regionError}
          onRetry={reloadRegions}
          firstPlaceholder="اختر المنطقة..."
          optionalPlaceholder="اختياري — منطقة أدق"
        />

        <HierarchySelect
          label={`🏷️ نوع ${businessLabel}`}
          tree={categoryTree}
          pathIds={categoryPath}
          onChange={setCategoryPath}
          loading={categoryLoading}
          error={categoryError}
          onRetry={reloadCategories}
          firstPlaceholder="اختر النوع..."
          optionalPlaceholder="اختياري — تصنيف أدق"
        />

        {type === "supplier" && (
          <HierarchySelect
            label="🛒 تصنيفات المتاجر التي تتابعها"
            tree={categoryTree}
            pathIds={networkCategoryPath}
            onChange={setNetworkCategoryPath}
            loading={categoryLoading}
            error={categoryError}
            onRetry={reloadCategories}
            firstPlaceholder="اختر تصنيف المتاجر..."
            optionalPlaceholder="اختياري — تصنيف أدق"
          />
        )}

        <PalestinianPhoneInput
          name="phone"
          value={form.phone}
          onValueChange={(phone) => setForm({ ...form, phone })}
          required
        />

        <div className="input-group">
          <label>واتساب (اختياري)</label>
          <input
            name="whatsapp"
            value={form.whatsapp}
            placeholder={WHATSAPP_PLACEHOLDER}
            dir="ltr"
            onChange={handleChange}
          />
          <small>+9705 أو +9725 ثم 6 أو 9 و7 أرقام</small>
        </div>

        <div className="input-group">
          <label>كود التفعيل</label>
          <input
            name="activationCodeSS"
            value={form.activationCodeSS}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>كلمة المرور</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? "جارٍ الإنشاء..." : "إنشاء حساب"}
        </button>

        <div className="switch-link">
          لديك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
