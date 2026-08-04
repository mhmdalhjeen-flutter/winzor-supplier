import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUpload';
import { normalizePickedImage } from '../utils/imageConvert';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

function normalizeImageFile(file) {
  if (!file) return null;
  const type = file.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const name = file.name && file.name.includes('.') ? file.name : `photo-${Date.now()}.${ext}`;
  if (file.name === name && file.type === type) return file;
  return new File([file], name, { type, lastModified: file.lastModified || Date.now() });
}

/**
 * Single-image uploader — tap the placeholder to pick camera or gallery.
 * Supports offline local preview via onLocalFileChange.
 */
export default function MediaUploader({
  label = 'الصورة',
  value = '',
  onChange,
  onLocalFileChange,
  onError,
  required = false,
  emptyHint = 'أضف صورة العنصر أو العرض',
}) {
  const inputId = useId();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const blobRef = useRef(null);

  useEffect(() => {
    if (value && value !== previewUrl && !localFile) {
      setPreviewUrl(value);
    }
  }, [value, localFile, previewUrl]);

  const revokeBlob = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  };

  const setLocalPreview = (file) => {
    revokeBlob();
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setLocalFile(file);
    setPreviewUrl(url);
    onLocalFileChange?.(file, url);
    onChange?.('');
  };

  const clearImage = () => {
    revokeBlob();
    setLocalFile(null);
    setPreviewUrl('');
    onLocalFileChange?.(null, '');
    onChange?.('');
  };

  const processSelectedFile = async (rawFile) => {
    const file = normalizeImageFile(rawFile);
    if (!file) return;

    setLocalPreview(file);

    if (!navigator.onLine) {
      onError?.('لا يوجد اتصال — تم حفظ الصورة محلياً وسيتم رفعها عند توفر الإنترنت');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange?.(url);
      revokeBlob();
      setLocalFile(null);
      setPreviewUrl(url);
      onLocalFileChange?.(null, '');
    } catch (err) {
      onError?.(err.message || 'فشل رفع الصورة — ستُرفع عند توفر الإنترنت');
    } finally {
      setUploading(false);
    }
  };

  const onFileInput = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const converted = await normalizePickedImage(file);
      await processSelectedFile(converted);
    } catch (err) {
      onError?.(err.message || 'تعذّر قراءة الصورة');
    }
  };

  const openSourcePicker = () => {
    if (uploading) return;
    setSourcePickerOpen(true);
  };

  const pickSource = (source) => {
    setSourcePickerOpen(false);
    if (source === 'camera') cameraRef.current?.click();
    else galleryRef.current?.click();
  };

  const hasImage = Boolean(previewUrl);
  const isLocalOnly = Boolean(localFile && !value);

  return (
    <div className="media-uploader media-uploader--single">
      <div className="media-uploader__head">
        <label className="field-label" htmlFor={inputId}>
          {label}
          {required && <span className="req"> *</span>}
        </label>
        <span className="media-uploader__hint">JPG · PNG · WebP · HEIC</span>
      </div>

      <div className={`media-upload-area ${hasImage ? 'has-image' : ''}`}>
        {!hasImage ? (
          <button
            type="button"
            className="media-upload-trigger"
            onClick={openSourcePicker}
            disabled={uploading}
            aria-label={emptyHint}
          >
            <div className="media-upload-empty">
              <div className="media-upload-empty__icon" aria-hidden>
                <ImageIcon size={32} strokeWidth={1.6} />
              </div>
              <p className="media-upload-empty__title">{emptyHint}</p>
              <p className="media-upload-empty__sub">اضغط لإضافة صورة</p>
            </div>
          </button>
        ) : (
          <div className="media-preview-panel">
            <button
              type="button"
              className="media-preview-wrap media-preview-wrap--compact"
              onClick={openSourcePicker}
              disabled={uploading}
              aria-label="استبدال الصورة"
            >
              <img src={previewUrl} alt="" className="media-preview-img" />
              {uploading && (
                <div className="media-preview-overlay">
                  <span>جاري الرفع...</span>
                </div>
              )}
              {isLocalOnly && !uploading && (
                <span className="media-preview-badge">محفوظة محلياً</span>
              )}
            </button>
            <div className="media-preview-actions media-preview-actions--compact">
              <button
                type="button"
                className="media-action-btn media-action-btn--outline"
                onClick={openSourcePicker}
                disabled={uploading}
              >
                <RefreshCw size={16} strokeWidth={2.2} />
                استبدال الصورة
              </button>
              <button
                type="button"
                className="media-action-btn media-action-btn--outline media-action-btn--danger"
                onClick={clearImage}
                disabled={uploading}
              >
                <Trash2 size={16} strokeWidth={2.2} />
                إزالة الصورة
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        id={inputId}
        ref={galleryRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden-input"
        onChange={onFileInput}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        className="hidden-input"
        onChange={onFileInput}
      />

      {sourcePickerOpen && (
        <div className="media-source-sheet" role="dialog" aria-modal="true" aria-label="اختر مصدر الصورة">
          <button
            type="button"
            className="media-source-sheet__backdrop"
            aria-label="إغلاق"
            onClick={() => setSourcePickerOpen(false)}
          />
          <div className="media-source-sheet__panel">
            <p className="media-source-sheet__title">اختر مصدر الصورة</p>
            <div className="media-source-sheet__actions">
              <button type="button" className="media-source-sheet__btn" onClick={() => pickSource('camera')}>
                <Camera size={20} strokeWidth={2} />
                الكاميرا
              </button>
              <button type="button" className="media-source-sheet__btn" onClick={() => pickSource('gallery')}>
                <ImageIcon size={20} strokeWidth={2} />
                المعرض
              </button>
            </div>
            <button type="button" className="media-source-sheet__cancel" onClick={() => setSourcePickerOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
