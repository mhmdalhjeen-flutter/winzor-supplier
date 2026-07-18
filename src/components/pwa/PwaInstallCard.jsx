import { Download, Smartphone, X, Zap, Clock, HardDrive, Wifi } from 'lucide-react';
import { BRAND_LOGO_128, BRAND_NAME } from '../../utils/brandAssets';

const BENEFITS = [
  { icon: Clock, text: 'يثبت خلال ثوانٍ.' },
  { icon: HardDrive, text: 'لا يحتاج مساحة كبيرة.' },
  { icon: Smartphone, text: 'يعمل مباشرة من الشاشة الرئيسية.' },
  { icon: Wifi, text: 'يعمل بدون إنترنت بعد أول استخدام.' },
];

export default function PwaInstallCard({ installing, onInstall, onLater, onClose }) {
  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-heading" dir="rtl">
      <button type="button" className="pwa-install-overlay__backdrop" aria-label="إغلاق" onClick={onLater} />
      <div className="pwa-install-card">
        <button type="button" className="pwa-install-card__close" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>

        <div className="pwa-install-card__hero">
          <div className="pwa-install-card__phone" aria-hidden>
            <div className="pwa-install-card__phone-notch" />
            <div className="pwa-install-card__phone-screen">
              <img src={BRAND_LOGO_128} alt="" width={56} height={56} className="pwa-install-card__logo" />
              <span className="pwa-install-card__phone-label">{BRAND_NAME}</span>
            </div>
          </div>
          <span className="pwa-install-card__badge">
            <Download size={14} />
            تطبيق ويب
          </span>
        </div>

        <h2 id="pwa-install-heading" className="pwa-install-card__title">
          ثبت {BRAND_NAME} على جهازك
        </h2>
        <p className="pwa-install-card__desc">إدارة متجرك بسرعة مثل التطبيقات.</p>

        <ul className="pwa-install-card__benefits">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="pwa-install-card__check" aria-hidden>✓</span>
              <Icon size={15} className="pwa-install-card__benefit-icon" aria-hidden />
              {text}
            </li>
          ))}
        </ul>

        <div className="pwa-install-card__actions">
          <button type="button" className="pwa-install-card__btn pwa-install-card__btn--ghost" onClick={onLater}>
            لاحقًا
          </button>
          <button
            type="button"
            className="pwa-install-card__btn pwa-install-card__btn--primary"
            onClick={onInstall}
            disabled={installing}
          >
            <Zap size={16} />
            {installing ? 'جاري التثبيت…' : 'تثبيت الآن'}
          </button>
        </div>
      </div>
    </div>
  );
}
