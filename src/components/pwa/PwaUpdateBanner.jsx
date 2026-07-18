import { RefreshCw, X } from 'lucide-react';
import usePwaUpdate from '../../hooks/usePwaUpdate';

export default function PwaUpdateBanner() {
  const { updateReady, refresh, dismiss } = usePwaUpdate();

  if (!updateReady) return null;

  return (
    <div className="pwa-banner pwa-banner--update" role="dialog" aria-labelledby="pwa-update-title" dir="rtl">
      <div className="pwa-banner__inner">
        <div className="pwa-banner__icon pwa-banner__icon--update" aria-hidden>
          <RefreshCw size={20} strokeWidth={2.2} />
        </div>
        <p id="pwa-update-title" className="pwa-banner__text">
          يتوفر إصدار جديد — حدّث الآن للحصول على آخر التحسينات.
        </p>
        <div className="pwa-banner__actions">
          <button type="button" className="pwa-banner__btn pwa-banner__btn--ghost" onClick={dismiss}>
            لاحقًا
          </button>
          <button type="button" className="pwa-banner__btn pwa-banner__btn--primary" onClick={refresh}>
            تحديث
          </button>
        </div>
        <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="إغلاق">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
