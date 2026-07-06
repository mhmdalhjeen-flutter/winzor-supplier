import { Wrench, Sparkles } from 'lucide-react';
import '../styles/Maintenance.css';

export default function Maintenance({ message }) {
  return (
    <div className="maintenance-page" dir="rtl">
      <div className="maintenance-glow maintenance-glow-a" />
      <div className="maintenance-glow maintenance-glow-b" />

      <div className="maintenance-card">
        <div className="maintenance-icon-wrap">
          <Wrench size={42} strokeWidth={2} />
        </div>

        <div className="maintenance-badge">
          <Sparkles size={14} />
          <span>لوحة التجار</span>
        </div>

        <h1>الموقع تحت الصيانة حالياً</h1>
        <p className="maintenance-message">
          {message || 'نعمل على تحديثات وتحسينات — سنعود قريباً. شكراً لصبركم.'}
        </p>

        <div className="maintenance-footer">
          <span className="maintenance-dot" />
          <span>جميع الخدمات متوقفة مؤقتاً</span>
        </div>
      </div>
    </div>
  );
}
