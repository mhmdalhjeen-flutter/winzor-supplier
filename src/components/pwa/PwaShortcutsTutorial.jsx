import { X, PackagePlus, Tag, Store, Ticket } from 'lucide-react';
import { BRAND_LOGO_64, BRAND_NAME } from '../../utils/brandAssets';

const SHORTCUTS = [
  { icon: PackagePlus, label: 'إضافة منتج', description: 'أنشئ منتجاً جديداً', color: '#2563eb' },
  { icon: Tag, label: 'إضافة عرض', description: 'انشر عرضاً جديداً', color: '#059669' },
  { icon: Store, label: 'متجري', description: 'إدارة ملف المتجر', color: '#475569' },
  { icon: Ticket, label: 'شراء أكواد', description: 'اطلب بطاقات الهدايا', color: '#7c3aed' },
];

export default function PwaShortcutsTutorial({ onClose }) {
  return (
    <div className="pwa-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-tutorial-title" dir="rtl">
      <button type="button" className="pwa-install-overlay__backdrop" aria-label="إغلاق" onClick={onClose} />
      <div className="pwa-tutorial-card">
        <button type="button" className="pwa-install-card__close" onClick={onClose} aria-label="إغلاق">
          <X size={18} />
        </button>

        <div className="pwa-tutorial-illustration" aria-hidden>
          <div className="pwa-tutorial-illustration__home">
            <div className="pwa-tutorial-illustration__icons-row">
              {SHORTCUTS.map(({ icon: Icon, label, color }) => (
                <div key={label} className="pwa-tutorial-illustration__mini-icon" style={{ color }}>
                  <Icon size={14} strokeWidth={2.2} />
                </div>
              ))}
            </div>
            <div className="pwa-tutorial-illustration__app-icon">
              <img src={BRAND_LOGO_64} alt="" width={40} height={40} />
            </div>
            <span className="pwa-tutorial-illustration__press-hint">اضغط مطولًا</span>
            <div className="pwa-tutorial-illustration__menu">
              {SHORTCUTS.map(({ icon: Icon, label, color }) => (
                <div key={label} className="pwa-tutorial-illustration__menu-item">
                  <span style={{ color }}><Icon size={14} /></span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 id="pwa-tutorial-title" className="pwa-tutorial-card__title">هل تعلم؟</h2>
        <p className="pwa-tutorial-card__body">
          يمكنك الضغط مطولًا على أيقونة {BRAND_NAME} للوصول السريع إلى:
        </p>
        <ul className="pwa-tutorial-list">
          {SHORTCUTS.map(({ icon: Icon, label, description, color }) => (
            <li key={label} className="pwa-tutorial-list__item">
              <span className="pwa-tutorial-list__icon" style={{ color }}>
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <span>
                <strong>{label}</strong>
                <span className="pwa-tutorial-list__desc">{description}</span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="pwa-install-card__btn pwa-install-card__btn--primary pwa-tutorial-card__ok" onClick={onClose}>
          فهمت
        </button>
      </div>
    </div>
  );
}
