import { Phone, Pencil, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import "../styles/dashboard.css";
import "../styles/AddProductsOffers.css";
import ImagePicker from "../components/ImagePicker";
import CollapsibleSection from "../components/CollapsibleSection";
import api from "../services/api";
import { getMyStore, updateMyStore } from "../services/store.service";
import { queryKeys } from "../lib/queryClient";
import { readCachedMyStore, writeCachedMyStore } from "../utils/settingsCache";
import {
  LOCAL_PHONE_PLACEHOLDER,
  sanitizeLocalPhoneInput,
  getPhoneCarrier,
  getPhoneInputStyle,
} from "../utils/phoneValidation";
import ItemCategoriesSection from "../components/ItemCategoriesSection";
import useStoreOwnerPermissions from "../hooks/useStoreOwnerPermissions";

function hasBrandingImage(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });

  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const { isStoreOwner } = useStoreOwnerPermissions();

  const { data: storeResponse, isLoading: loading } = useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async () => {
      const { data } = await getMyStore();
      writeCachedMyStore(data);
      return data;
    },
    placeholderData: () => readCachedMyStore(),
    staleTime: 0,
    enabled: !isSupplier,
  });

  const store = storeResponse?.store;
  const displayLogo = storeForm.logo || store?.logo || "";
  const displayCover = storeForm.coverImage || store?.coverImage || "";
  const hasLogo = hasBrandingImage(displayLogo);
  const hasCover = hasBrandingImage(displayCover);
  const displayName = storeForm.name || store?.name || user.name || (isSupplier ? "المستودع" : "المتجر");
  const displayPhone = storeForm.phone || store?.phone || user.phone || user.email || "";

  const showMsg = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(""), 4000);
  };

  useEffect(() => {
    if (!store) return;
    setStoreForm({
      name: store.name || "",
      description: store.description || "",
      phone: store.phone || "",
      whatsapp: store.whatsapp || "",
      address: store.address || "",
      logo: store.logo || "",
      coverImage: store.coverImage || "",
      region: store.region || "",
      subRegion: store.subRegion || "",
    });
  }, [store]);

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
      const next = {
        ...(queryClient.getQueryData(queryKeys.myStore) || {}),
        store: data.store,
      };
      queryClient.setQueryData(queryKeys.myStore, next);
      writeCachedMyStore(next);
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

  const handleStoreClosedToggle = async (closed) => {
    if (!store || statusSaving) return;
    const previousOpen = store.isOpen !== false;
    const optimistic = {
      ...(queryClient.getQueryData(queryKeys.myStore) || {}),
      store: { ...(storeResponse?.store || store), isOpen: !closed },
    };
    queryClient.setQueryData(queryKeys.myStore, optimistic);
    writeCachedMyStore(optimistic);
    setStatusSaving(true);
    try {
      const { data } = await updateMyStore({ isOpen: !closed });
      const next = {
        ...(queryClient.getQueryData(queryKeys.myStore) || {}),
        store: data.store,
      };
      queryClient.setQueryData(queryKeys.myStore, next);
      writeCachedMyStore(next);
      showMsg(closed ? "تم إغلاق المتجر" : "تم فتح المتجر");
    } catch (err) {
      const rolledBack = {
        ...(queryClient.getQueryData(queryKeys.myStore) || {}),
        store: { ...(storeResponse?.store || store), isOpen: previousOpen },
      };
      queryClient.setQueryData(queryKeys.myStore, rolledBack);
      writeCachedMyStore(rolledBack);
      showMsg(err.response?.data?.message || "تعذّر تحديث حالة المتجر", true);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="profile-page">
      {message.text && (
        <div className={message.isError ? "alert-error" : "alert-success"}>{message.text}</div>
      )}

      {store && (
        <section id="store-branding" className="profile-hero">
          <div
            className="profile-hero__cover"
            style={{
              backgroundImage: hasCover
                ? `url(${displayCover})`
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          />
          <div className="profile-hero__body">
            <div className="profile-hero__logo-wrap">
              {hasLogo ? (
                <img src={displayLogo} alt="" className="profile-hero__logo" />
              ) : (
                <div className="profile-hero__logo profile-hero__logo--fallback">
                  {displayName?.charAt(0) || "🏪"}
                </div>
              )}
            </div>
            <div className="profile-hero__info">
              <h2 className="profile-hero__name">{displayName}</h2>
              {store.category && (
                <span className="profile-hero__category">{store.category}</span>
              )}
              {displayPhone && (
                <p className="profile-hero__phone" dir="ltr">
                  <Phone size={14} strokeWidth={2.2} aria-hidden />
                  <span>{displayPhone}</span>
                </p>
              )}
            </div>
            {!isEditingStore && (
              <button
                type="button"
                className="profile-hero__edit-btn"
                onClick={() => setIsEditingStore(true)}
              >
                <Pencil size={15} strokeWidth={2.2} />
                تعديل المتجر
              </button>
            )}
          </div>
        </section>
      )}

      {!isSupplier && store && (!hasLogo || !hasCover) && (
        <div className="profile-branding-alert">
          <Camera size={18} strokeWidth={2.2} aria-hidden />
          <div>
            <strong>أكمل هوية متجرك</strong>
            <p>
              {!hasLogo && !hasCover
                ? "أضف شعاراً وغلافاً لمتجرك ليظهر بشكل احترافي."
                : !hasLogo
                  ? "أضف شعاراً لمتجرك."
                  : "أضف غلافاً لمتجرك."}
            </p>
          </div>
          {!isEditingStore && (
            <button type="button" className="profile-branding-alert__btn" onClick={() => setIsEditingStore(true)}>
              رفع الآن
            </button>
          )}
        </div>
      )}

      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-header-card__body">
            {isEditingUser ? (
              <form className="profile-header-card__edit-form" onSubmit={saveUser}>
                <label className="field-label" htmlFor="profile-user-name">الاسم</label>
                <input
                  id="profile-user-name"
                  name="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  autoFocus
                />
                <div className="profile-header-card__edit-actions">
                  <button type="submit" className="save-btn" disabled={saving}>حفظ</button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditingUser(false)}>إلغاء</button>
                </div>
              </form>
            ) : (
              <>
                <div className="profile-header-card__title-row">
                  <h3 className="profile-header-card__name">{user.name || "حسابي"}</h3>
                  <span className="profile-header-card__role">{isSupplier ? "تاجر معتمد" : "صاحب محل"}</span>
                </div>
                {(user.phone || user.email) && (
                  <p className="profile-header-card__phone" dir="ltr">
                    <Phone size={14} strokeWidth={2.2} aria-hidden />
                    <span>{user.phone || user.email}</span>
                  </p>
                )}
              </>
            )}
          </div>
          {!isEditingUser && (
            <button type="button" className="edit-profile-btn profile-header-card__edit" onClick={() => setIsEditingUser(true)}>
              <Pencil size={15} strokeWidth={2.2} />
              تعديل
            </button>
          )}
        </div>

        <div className="profile-settings-links">
          {!isSupplier && isStoreOwner && store && (
            <div className="profile-settings-link profile-store-status">
              <span className="profile-settings-link__icon" aria-hidden>🏪</span>
              <span className="profile-settings-link__text">
                <strong>إغلاق المتجر</strong>
                <small>
                  {store.isOpen === false
                    ? "المتجر مغلق حالياً. الزبائن يمكنهم إرسال الطلب ليتم التعامل معه عند الفتح."
                    : "المتجر مفتوح. فعّل المفتاح لإغلاقه أمام الطلبات الجديدة مع إبقاء المتجر ظاهراً."}
                </small>
              </span>
              <label className="switch switch--danger" title={store.isOpen === false ? "فتح المتجر" : "إغلاق المتجر"}>
                <input
                  type="checkbox"
                  checked={store.isOpen === false}
                  disabled={statusSaving}
                  onChange={(e) => handleStoreClosedToggle(e.target.checked)}
                />
                <span className="switch__slider" />
              </label>
            </div>
          )}
          {!isSupplier && isStoreOwner && (
            <>
              <Link to={`${baseRoute}/payment-settings`} className="profile-settings-link">
                <span className="profile-settings-link__icon">💳</span>
                <span className="profile-settings-link__text">
                  <strong>إعدادات الدفع</strong>
                  <small>طرق الدفع والحسابات النشطة</small>
                </span>
              </Link>
              <Link to={`${baseRoute}/receiving-settings`} className="profile-settings-link">
                <span className="profile-settings-link__icon">📦</span>
                <span className="profile-settings-link__text">
                  <strong>طرق الاستلام</strong>
                  <small>التوصيل القريب واستلام الطلب من المتجر</small>
                </span>
              </Link>
            </>
          )}
          <Link to={`${baseRoute}/change-password`} className="profile-settings-link">
            <span className="profile-settings-link__icon">🔐</span>
            <span className="profile-settings-link__text">
              <strong>تغيير كلمة المرور</strong>
              <small>تحديث كلمة مرور حسابك</small>
            </span>
          </Link>
        </div>

        {!isSupplier && isStoreOwner && (
          <CollapsibleSection
            title="أنواع العناصر"
            subtitle="إدارة تصنيفات العناصر والعروض في متجرك"
            open={categoriesOpen}
            onToggle={() => setCategoriesOpen((v) => !v)}
          >
            <ItemCategoriesSection embedded />
          </CollapsibleSection>
        )}

        {store && (
          <div className="profile-details-form">
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
                    <input value={storeForm.region} disabled className="input-readonly" title="تواصل مع الإدارة لتغيير المنطقة" />
                    <p className="field-hint-inline">لتغيير المنطقة تواصل مع الإدارة</p>
                  </div>
                  <div className="form-group">
                    <label>المنطقة الفرعية</label>
                    <input value={storeForm.subRegion} disabled className="input-readonly" />
                  </div>
                </div>

                <div className="form-group">
                  <label>نوع النشاط</label>
                  <input value={store.category || ""} disabled className="input-readonly" />
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
                  {storeForm.whatsapp && <span>💬 واتساب: {storeForm.whatsapp}</span>}
                  {storeForm.address && <span>📍 {storeForm.address}</span>}
                  {storeForm.region && (
                    <span>
                      🗺️ {storeForm.region}
                      {storeForm.subRegion ? ` — ${storeForm.subRegion}` : ""}
                    </span>
                  )}
                  {store.category && <span>🏷️ {store.category}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
