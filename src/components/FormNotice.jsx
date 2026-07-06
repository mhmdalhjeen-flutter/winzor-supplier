import { useCallback, useEffect, useRef, useState } from 'react';

export function useFormNotice() {
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);

  const clearNotice = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotice(null);
  }, []);

  const showNotice = useCallback((text, type = 'error', duration = 4500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotice({ text, type });
    if (duration > 0) {
      timerRef.current = window.setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, duration);
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { notice, showNotice, clearNotice };
}

export function FormNoticeToast({ notice, onClose }) {
  if (!notice?.text) return null;

  return (
    <div
      className={`form-notice-toast form-notice-toast--${notice.type || 'error'}`}
      role="alert"
      aria-live="polite"
    >
      <span className="form-notice-toast__icon">
        {notice.type === 'success' ? '✓' : notice.type === 'info' ? 'ℹ' : '!'}
      </span>
      <p className="form-notice-toast__text">{notice.text}</p>
      <button type="button" className="form-notice-toast__close" onClick={onClose} aria-label="إغلاق">
        ×
      </button>
    </div>
  );
}

export function FormRulesPopup({ open, title, rules, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="form-rules-backdrop" onClick={onClose}>
      <div
        className="form-rules-popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-rules-title"
      >
        <div className="form-rules-popup__head">
          <h3 id="form-rules-title">{title}</h3>
          <button type="button" className="form-rules-popup__close" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        <ul className="form-rules-popup__list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <button type="button" className="form-rules-popup__btn" onClick={onClose}>
          فهمت
        </button>
      </div>
    </div>
  );
}
