import { useRef } from 'react';
import { fileToOptimizedDataUrl } from '../utils/imageUpload';

const pickOptimized = async (file) => {
  if (!file) throw new Error('لم تُختر صورة');
  if (file.size > 600_000) throw new Error('حجم الصورة كبير — الحد 600KB');
  return fileToOptimizedDataUrl(file);
};

/**
 * اختيار صورة: كاميرا | جهاز | رابط
 */
export default function ImagePicker({ label, value, onChange, onError, required = false }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const pickFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      onChange(await pickOptimized(file));
    } catch (err) {
      if (onError) onError(err.message);
      else alert(err.message);
    }
    e.target.value = '';
  };

  return (
    <div className="image-picker">
      <label className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </label>

      {value && (
        <div className="image-preview-wrap">
          <img src={value} alt="" className="image-preview" />
          <button type="button" className="image-remove" onClick={() => onChange('')}>
            إزالة
          </button>
        </div>
      )}

      <div className="image-source-tabs">
        <button type="button" onClick={() => cameraRef.current?.click()}>
          📷 الكاميرا
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          📁 الجهاز
        </button>
      </div>

      <input
        type="url"
        placeholder="أو الصق رابط الصورة"
        value={value?.startsWith('http') ? value : ''}
        onChange={(e) => onChange(e.target.value.trim())}
        dir="ltr"
        className="url-input"
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden-input" onChange={pickFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden-input" onChange={pickFile} />
    </div>
  );
}
