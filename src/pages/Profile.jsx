import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";
import ImagePicker from "../components/ImagePicker";
import api from "../services/api";
import { getMyStore, updateMyStore } from "../services/store.service";
import {
  LOCAL_PHONE_PLACEHOLDER,
  sanitizeLocalPhoneInput,
  getPhoneCarrier,
  getPhoneInputStyle,
} from "../utils/phoneValidation";

export default function Profile() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const [store, setStore] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [userForm, setUserForm] = useState({ name: user.name || "", phone: user.phone || "" });
  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    address: "",
    logo: "",
    coverImage: "",
    region: "",
    subRegion: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(""), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getMyStore();
        setStore(data.store);
        setStoreForm({
          name: data.store.name || "",
          description: data.store.description || "",
          phone: data.store.phone || "",
          whatsapp: data.store.whatsapp || "",
          address: data.store.address || "",
          logo: data.store.logo || "",
          coverImage: data.store.coverImage || "",
          region: data.store.region || "",
          subRegion: data.store.subRegion || "",
        });
      } catch {
        showMsg("تعذّر تحميل بيانات المتجر", true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (window.location.hash === "#branding") {
      document.getElementById("store-branding")?.scrollIntoView({ behavior: "smooth" });
      setIsEditingStore(true);
    }
  }, [loading]);

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/users/update-profile", { name: userForm.name.trim() });
      const updated = { ...user, name: data.user?.name || userForm.name };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setIsEditingUser(false);
      showMsg("تم تحديث البيانات الشخصية");
    } catch (err) {
      showMsg(err.response?.data?.message || "تعذّر الحفظ", true);
    } finally {
      setSaving(false);
    }
  };

  const saveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.logo) {
      showMsg("صورة المتجر مطلوبة", true);
      return;
    }
    if (!storeForm.coverImage) {
      showMsg("غلاف المتجر مطلوب", true);
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateMyStore({
        name: storeForm.name.trim(),
        description: storeForm.description.trim(),
        phone: storeForm.phone,
        whatsapp: storeForm.whatsapp,
        address: storeForm.address,
        logo: storeForm.logo,
        coverImage: storeForm.coverImage,
      });
      setStore(data.store);
      setStoreForm({
        name: data.store.name || "",
        description: data.store.description || "",
        phone: data.store.phone || "",
        whatsapp: data.store.whatsapp || "",
        address: data.store.address || "",
        logo: data.store.logo || "",
        coverImage: data.store.coverImage || "",
        region: data.store.region || "",
        subRegion: data.store.subRegion || "",
      });
      setIsEditingStore(false);
      showMsg("تم تحديث بيانات المتجر");
    } catch (err) {
      showMsg(err.response?.data?.message || "تعذّر حفظ المتجر", true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <h2 className="title">👤 الملف الشخصي</h2>

      {message.text && (
        <div className={message.isError ? "alert-error" : "alert-success"}>{message.text}</div>
      )}
      {store && (
        <section id="store-branding" className="profile-store-section">
          <div className="profile-cover-wrap">
            <div
              className="profile-cover"
              style={{
                backgroundImage: storeForm.coverImage
                  ? `url(${storeForm.coverImage})`
                  : "linear-gradient(135deg,#667eea,#764ba2)",
              }}
            />
            {storeForm.logo ? (
              <img src={storeForm.logo} alt="" className="profile-store-logo" />
            ) : (
              <div className="profile-store-logo fallback">{store.name?.charAt(0) || "🏪"}</div>
            )}
          </div>

          <div className="profile-details-form">
            <div className="section-head">
              <div>
                <h3>{storeForm.name || store.name}</h3>
                <p className="muted-text">نوع النشاط: {store.category}</p>
              </div>
              {!isEditingStore && (
                <button type="button" className="edit-profile-btn" onClick={() => setIsEditingStore(true)}>
                  تعديل المتجر
                </button>
              )}
            </div>

            {isEditingStore ? (
              <form onSubmit={saveStore} className="store-edit-form">
                <ImagePicker
                  label="صورة المتجر (الشعار)"
                  value={storeForm.logo}
                  onChange={(logo) => setStoreForm({ ...storeForm, logo })}
                  required
                />
                <ImagePicker
                  label="غلاف المتجر (Cover)"
                  value={storeForm.coverImage}
                  onChange={(coverImage) => setStoreForm({ ...storeForm, coverImage })}
                  required
                />

                <div className="form-row">
                  <div className="form-group">
                    <label>اسم المتجر</label>
                    <input
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>هاتف المتجر</label>
                    <input
                      dir="ltr"
                      value={storeForm.phone}
                      onChange={(e) => setStoreForm({ ...storeForm, phone: sanitizeLocalPhoneInput(e.target.value) })}
                      placeholder={LOCAL_PHONE_PLACEHOLDER}
                      maxLength={10}
                      style={getPhoneInputStyle(getPhoneCarrier(storeForm.phone))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>وصف المتجر</label>
                  <textarea
                    rows={3}
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>المنطقة</label>
                    <input value={storeForm.region} disabled className="input-readonly" />
                  </div>
                  <div className="form-group">
                    <label>المنطقة الفرعية</label>
                    <input value={storeForm.subRegion} disabled className="input-readonly" />
                  </div>
                </div>

                <div className="form-group">
                  <label>العنوان التفصيلي</label>
                  <input
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    placeholder="شارع، مبنى، مدينة..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>واتساب (اختياري)</label>
                    <input
                      dir="ltr"
                      value={storeForm.whatsapp}
                      onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? "جارٍ الحفظ..." : "حفظ بيانات المتجر"}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditingStore(false)}>
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-store-summary">
                {storeForm.description && (
                  <p className="profile-summary-block"><strong>الوصف:</strong> {storeForm.description}</p>
                )}
                <div className="profile-summary-grid">
                  {storeForm.phone && <span>📞 {storeForm.phone}</span>}
                  {storeForm.whatsapp && <span>💬 {storeForm.whatsapp}</span>}
                  {storeForm.address && <span>📍 {storeForm.address}</span>}
                  {storeForm.region && <span>🗺️ {storeForm.region} — {storeForm.subRegion}</span>}
                </div>
                <p className="muted-text">يمكنك تعديل صورة المتجر والغلاف وبيانات العرض في أي وقت.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── بيانات الحساب ── */}
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="avatar-large">{user.name?.charAt(0).toUpperCase()}</div>
          <div className="profile-info-summary">
            <h3>{user.name}</h3>
            <p className="role-badge">{user.role === "supplier" ? "تاجر معتمد" : "صاحب محل"}</p>
            <p className="email-text">{user.email || user.phone}</p>
          </div>
          {!isEditingUser && (
            <button type="button" className="edit-profile-btn" onClick={() => setIsEditingUser(true)}>
              تعديل الاسم
            </button>
          )}
        </div>

        <div className="profile-details-form">
          <form onSubmit={saveUser}>
            <div className="form-group">
              <label>الاسم الكامل</label>
              <input
                name="name"
                value={isEditingUser ? userForm.name : user.name}
                disabled={!isEditingUser}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>

            {isEditingUser && (
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>حفظ</button>
                <button type="button" className="cancel-btn" onClick={() => setIsEditingUser(false)}>إلغاء</button>
              </div>
            )}
          </form>
        </div>

        <div className="profile-details-form" style={{ marginTop: 16 }}>
          <Link to="change-password" className="save-btn" style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
            🔐 تغيير كلمة المرور
          </Link>
        </div>
      </div>
    </div>
  );
}
