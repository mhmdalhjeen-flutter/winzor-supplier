import { useRef, useState } from 'react';
import { uploadImage } from '../utils/imageUpload';

/**
 * اختيار صورة من الجهاز أو الكاميرا فقط.
 * الرفع عبر Cloudinary (POST /api/upload/image) → HTTPS URL.
 */
export default function ImagePicker({ label, value, onChange, onError, required = false }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      onChange(await uploadImage(file));
    } catch (err) {
      if (onError) onError(err.message);
      else alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
          <button type="button" className="image-remove" onClick={() => onChange('')} disabled={uploading}>
            إزالة
          </button>
        </div>
      )}

      <div className="image-source-tabs">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}>
          📷 الكاميرا
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
          📁 الجهاز
        </button>
      </div>

      {uploading && <p className="image-uploading">جاري رفع الصورة...</p>}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden-input" onChange={pickFile} />
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" capture="environment" className="hidden-input" onChange={pickFile} />
    </div>
  );
}
