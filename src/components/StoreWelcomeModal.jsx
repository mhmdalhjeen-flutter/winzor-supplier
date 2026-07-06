import { useState } from "react";
import { applyDefaultBranding, dismissBrandingWelcome } from "../services/store.service";

export default function StoreWelcomeModal({ open, store, suggestedDefaults, baseRoute, onDone, navigate }) {
  const [loading, setLoading] = useState(false);

  if (!open || !store) return null;

  const handleUploadSelf = async () => {
    setLoading(true);
    try {
      await dismissBrandingWelcome();
      onDone?.();
      navigate(`${baseRoute}/profile#branding`);
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر المتابعة");
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefaults = async () => {
    setLoading(true);
    try {
      await applyDefaultBranding();
      onDone?.();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر تعيين الصور الافتراضية");
    } finally {
      setLoading(false);
    }
  };

  const previewLogo = suggestedDefaults?.logo;
  const previewCover = suggestedDefaults?.cover;
  const typeLabel = suggestedDefaults?.label || "متجر";

  return (
    <div className="welcome-modal-backdrop" role="dialog" aria-modal="true">
      <div className="welcome-modal">
        <h2>🎉 مرحباً بك في لوحة متجرك!</h2>
        <p className="welcome-lead">
          لم ترفع بعد صورة أو غلافاً لمتجرك <strong>{store.name}</strong>.
          يمكنك رفع صورك بنفسك، أو استخدام الصورة الافتراضية التي يقترحها النظام
          حسب نوع نشاطك ({typeLabel}).
        </p>
        <p className="welcome-note">
          💡 يمكنك تغيير الصورة والغلاف في أي وقت من الملف الشخصي.
        </p>

        {(previewCover || previewLogo) && (
          <div className="welcome-preview">
            {previewCover && (
              <div className="welcome-cover" style={{ backgroundImage: `url(${previewCover})` }} />
            )}
            {previewLogo && (
              <img src={previewLogo} alt="" className="welcome-logo" />
            )}
          </div>
        )}

        <div className="welcome-actions">
          <button type="button" className="welcome-btn primary" disabled={loading} onClick={handleUploadSelf}>
            📷 رفع صورة وغلاف بنفسي
          </button>
          <button type="button" className="welcome-btn secondary" disabled={loading} onClick={handleUseDefaults}>
            {loading ? "جارٍ التعيين..." : `✨ استخدام الصورة الافتراضية (${typeLabel})`}
          </button>
        </div>
      </div>
    </div>
  );
}
