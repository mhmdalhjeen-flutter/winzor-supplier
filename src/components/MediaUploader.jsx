import { useEffect, useId, useRef, useState } from 'react';
import { uploadImage } from '../utils/imageUpload';
import ImageCropModal from './ImageCropModal';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov`;

function isImageFile(file) {
  return file?.type?.startsWith('image/');
}

function isVideoFile(file) {
  return file?.type?.startsWith('video/');
}

function newLocalId() {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMainImageUrl(list) {
  const main = list.find((item) => item.isMain && item.url && item.kind === 'image')
    || list.find((item) => item.url && item.kind === 'image');
  return main?.url || '';
}

/**
 * Social-style media uploader for product/offer creation.
 * Uploads images via existing /upload/image API; videos are local preview only.
 * Parent receives the main cover image URL via onChange (API contract unchanged).
 */
export default function MediaUploader({
  label = 'الصور والوسائط',
  value = '',
  onChange,
  onError,
  required = false,
  emptyHint = 'أضف صور المنتج أو العرض',
}) {
  const inputId = useId();
  const fileRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const pendingQueue = useRef([]);

  useEffect(() => {
    const nextUrl = getMainImageUrl(items);
    if (nextUrl !== value) onChange?.(nextUrl);
  }, [items, onChange, value]);

  // Hydrate from parent URL (draft restore / remount) when gallery is empty
  useEffect(() => {
    if (!value || items.length > 0) return;
    setItems([{
      id: newLocalId(),
      kind: 'image',
      name: 'cover',
      previewUrl: value,
      url: value,
      status: 'done',
      progress: 100,
      isMain: true,
    }]);
  }, [value, items.length]);

  const markMain = (id) => {
    setItems((prev) => prev.map((item) => ({
      ...item,
      isMain: item.id === id && item.kind === 'image' && Boolean(item.url),
    })));
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.previewUrl?.startsWith('blob:') && removed.previewUrl !== removed.url) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      let next = prev.filter((item) => item.id !== id);
      if (removed?.isMain) {
        const firstImage = next.find((item) => item.kind === 'image' && item.url);
        next = next.map((item) => ({
          ...item,
          isMain: firstImage ? item.id === firstImage.id : false,
        }));
      }
      return next;
    });
  };

  const uploadOneImage = async (file, id) => {
    setItems((prev) => prev.map((item) => (
      item.id === id ? { ...item, status: 'uploading', progress: 35 } : item
    )));

    try {
      const url = await uploadImage(file);
      setItems((prev) => {
        const hasMain = prev.some((item) => item.isMain && item.url);
        return prev.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            url,
            previewUrl: url,
            status: 'done',
            progress: 100,
            isMain: !hasMain,
          };
        });
      });
    } catch (err) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      onError?.(err.message || 'فشل رفع الصورة');
    }
  };

  const enqueueFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => isImageFile(f) || isVideoFile(f));
    if (!files.length) {
      onError?.('اختر صورة أو فيديو صالح');
      return;
    }

    const images = files.filter(isImageFile);
    const videos = files.filter(isVideoFile);

    videos.forEach((file) => {
      const id = newLocalId();
      const previewUrl = URL.createObjectURL(file);
      setItems((prev) => [
        ...prev,
        {
          id,
          kind: 'video',
          name: file.name,
          previewUrl,
          url: '',
          status: 'local',
          progress: 100,
          isMain: false,
        },
      ]);
    });

    if (images.length) {
      pendingQueue.current = [...pendingQueue.current, ...images];
      if (!cropOpen) openNextCrop();
    }
  };

  const openNextCrop = () => {
    const next = pendingQueue.current.shift();
    if (!next) {
      setCropFile(null);
      setCropOpen(false);
      return;
    }
    setCropFile(next);
    setCropOpen(true);
  };

  const handleCropConfirm = (croppedFile) => {
    setCropOpen(false);
    setCropFile(null);
    const id = newLocalId();
    const previewUrl = URL.createObjectURL(croppedFile);
    setItems((prev) => [
      ...prev,
      {
        id,
        kind: 'image',
        name: croppedFile.name,
        previewUrl,
        url: '',
        status: 'uploading',
        progress: 15,
        isMain: false,
      },
    ]);
    uploadOneImage(croppedFile, id).finally(() => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      openNextCrop();
    });
  };

  const handleCropCancel = () => {
    // Skip crop → upload original
    const original = cropFile;
    setCropOpen(false);
    setCropFile(null);
    if (original) {
      const id = newLocalId();
      const previewUrl = URL.createObjectURL(original);
      setItems((prev) => [
        ...prev,
        {
          id,
          kind: 'image',
          name: original.name,
          previewUrl,
          url: '',
          status: 'uploading',
          progress: 15,
          isMain: false,
        },
      ]);
      uploadOneImage(original, id).finally(() => {
        if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        openNextCrop();
      });
    } else {
      openNextCrop();
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    enqueueFiles(e.dataTransfer.files);
  };

  const hasMedia = items.length > 0;
  const uploading = items.some((item) => item.status === 'uploading');

  return (
    <div className="media-uploader">
      <div className="media-uploader__head">
        <label className="field-label" htmlFor={inputId}>
          {label}
          {required && <span className="req"> *</span>}
        </label>
        <span className="media-uploader__hint">الصورة الأولى هي الغلاف — يمكنك تغييرها</span>
      </div>

      <div
        className={`media-dropzone ${dragging ? 'is-dragging' : ''} ${hasMedia ? 'has-media' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
      >
        {!hasMedia ? (
          <div className="media-empty">
            <div className="media-empty__icon" aria-hidden>🖼️</div>
            <p className="media-empty__title">{emptyHint}</p>
            <p className="media-empty__sub">اسحب الملفات هنا أو اضغط للاختيار · صور وفيديو</p>
            <span className="media-empty__cta">رفع الوسائط</span>
          </div>
        ) : (
          <div className="media-grid" onClick={(e) => e.stopPropagation()}>
            {items.map((item) => (
              <div
                key={item.id}
                className={`media-thumb ${item.isMain ? 'is-main' : ''} ${item.status === 'uploading' ? 'is-uploading' : ''}`}
              >
                {item.kind === 'video' ? (
                  <video src={item.previewUrl} muted playsInline className="media-thumb__media" />
                ) : (
                  <img src={item.previewUrl || item.url} alt="" className="media-thumb__media" />
                )}

                {item.isMain && <span className="media-thumb__badge">الغلاف</span>}
                {item.kind === 'video' && <span className="media-thumb__badge media-thumb__badge--video">فيديو</span>}

                {item.status === 'uploading' && (
                  <div className="media-thumb__progress" aria-label="جاري الرفع">
                    <div className="media-thumb__bar" style={{ width: `${item.progress || 30}%` }} />
                    <span>جاري الرفع...</span>
                  </div>
                )}

                <div className="media-thumb__actions">
                  {item.kind === 'image' && item.url && !item.isMain && (
                    <button type="button" onClick={() => markMain(item.id)}>تعيين غلاف</button>
                  )}
                  <button type="button" className="danger" onClick={() => removeItem(item.id)}>إزالة</button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="media-add-tile"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <span>+</span>
              إضافة
            </button>
          </div>
        )}
      </div>

      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="hidden-input"
        onChange={(e) => {
          enqueueFiles(e.target.files);
          e.target.value = '';
        }}
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
