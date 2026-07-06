import { useState } from 'react';
import { uploadImage } from '../utils/imageUpload';

/**
 * مثال على رفع صورة إلى Cloudinary: اختيار ملف → رفع → حفظ URL.
 */
export default function CloudinaryImageUpload({ label = 'رفع صورة', onChange, onError }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      onChange?.(url);
    } catch (err) {
      const message = err.message || 'فشل رفع الصورة';
      onError?.(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cloudinary-image-upload">
      <label className="field-label">{label}</label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p>جاري الرفع...</p>}
      {imageUrl && (
        <div className="image-preview-wrap">
          <img src={imageUrl} alt="" className="image-preview" />
          <p dir="ltr">{imageUrl}</p>
        </div>
      )}
    </div>
  );
}
