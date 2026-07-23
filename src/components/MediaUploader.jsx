import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { uploadImage } from '../utils/imageUpload';
import { normalizePickedImage } from '../utils/imageConvert';
import ImageCropModal from './ImageCropModal';

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
 * Single-image uploader with separate camera / gallery inputs.
 * Supports offline local preview via onLocalFileChange.
 */
export default function MediaUploader({
  label = 'الصورة',
  value = '',
  onChange,
  onLocalFileChange,
  onError,
  required = false,
  emptyHint = 'أضف صورة المنتج أو العرض',
}) {
  const inputId = useId();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
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

  const startCrop = async (file) => {
    try {
      const converted = await normalizePickedImage(file);
      const normalized = normalizeImageFile(converted);
      if (!normalized) {
        onError?.('ملف غير صالح');
        return;
      }
      setCropFile(normalized);
      setCropOpen(true);
    } catch (err) {
      onError?.(err.message || 'تعذّر قراءة الصورة');
    }
  };

  const handleCropConfirm = async (croppedFile) => {
    setCropOpen(false);
    setCropFile(null);
    await processSelectedFile(croppedFile);
  };

  const handleCropCancel = async () => {
    const original = cropFile;
    setCropOpen(false);
    setCropFile(null);
    if (original) await processSelectedFile(original);
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

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) startCrop(file);
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
          <div className="media-upload-empty">
            <div className="media-upload-empty__icon" aria-hidden>
              <ImageIcon size={36} strokeWidth={1.6} />
            </div>
            <p className="media-upload-empty__title">{emptyHint}</p>
            <p className="media-upload-empty__sub">التقط صورة أو اختر من المعرض</p>
            <div className="media-source-buttons">
              <button
                type="button"
                className="media-source-btn media-source-btn--camera"
                onClick={() => cameraRef.current?.click()}
                disabled={uploading}
              >
                <Camera size={20} strokeWidth={2} />
                التقاط صورة
              </button>
              <button
                type="button"
                className="media-source-btn media-source-btn--gallery"
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon size={20} strokeWidth={2} />
                اختيار من المعرض
              </button>
            </div>
          </div>
        ) : (
          <div className="media-preview-panel">
            <div className="media-preview-wrap media-preview-wrap--large">
              <img src={previewUrl} alt="" className="media-preview-img" />
              {uploading && (
                <div className="media-preview-overlay">
                  <span>جاري الرفع...</span>
                </div>
              )}
              {isLocalOnly && !uploading && (
                <span className="media-preview-badge">محفوظة محلياً</span>
              )}
            </div>
            <div className="media-preview-actions">
              <button
                type="button"
                className="media-action-btn"
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
              >
                <RefreshCw size={16} strokeWidth={2.2} />
                استبدال الصورة
              </button>
              <button
                type="button"
                className="media-action-btn media-action-btn--danger"
                onClick={clearImage}
                disabled={uploading}
              >
                <Trash2 size={16} strokeWidth={2.2} />
                إزالة
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

      <ImageCropModal
        open={cropOpen}
        file={cropFile}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
