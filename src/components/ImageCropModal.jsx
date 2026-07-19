import { useEffect, useRef, useState } from 'react';

/** Suggested store-display aspect ratios */
export const CROP_PRESETS = [
  { id: 'square', label: 'مربع 1:1', ratio: 1, hint: 'موصى به لعرض المتجر' },
  { id: 'portrait', label: 'عمودي 4:5', ratio: 4 / 5, hint: 'مناسب للمنشورات' },
  { id: 'landscape', label: 'أفقي 16:9', ratio: 16 / 9, hint: 'بانر / غلاف' },
  { id: 'free', label: 'حر', ratio: null, hint: 'بدون قص محدد' },
];

/**
 * Simple canvas crop before upload. Returns a File (JPEG).
 */
export default function ImageCropModal({ file, open, onCancel, onConfirm }) {
  const imgRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [preset, setPreset] = useState('square');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ x: 0, y: 0, size: 0, height: 0 });
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !file) return undefined;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setPreset('square');
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const initBox = (w, h, ratioId = preset) => {
    const ratio = CROP_PRESETS.find((p) => p.id === ratioId)?.ratio;
    let width;
    let height;
    if (!ratio) {
      width = w;
      height = h;
    } else if (w / h > ratio) {
      height = h;
      width = h * ratio;
    } else {
      width = w;
      height = w / ratio;
    }
    setBox({
      x: (w - width) / 2,
      y: (h - height) / 2,
      width,
      height,
    });
  };

  const onImageLoad = (e) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    initBox(w, h, preset);
  };

  const changePreset = (id) => {
    setPreset(id);
    if (natural.w && natural.h) initBox(natural.w, natural.h, id);
  };

  const clampBox = (next) => {
    const { w, h } = natural;
    let { x, y, width, height } = next;
    width = Math.max(40, Math.min(width, w));
    height = Math.max(40, Math.min(height, h));
    x = Math.max(0, Math.min(x, w - width));
    y = Math.max(0, Math.min(y, h - height));
    return { x, y, width, height };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img || !natural.w) return;
    const rect = img.getBoundingClientRect();
    const scaleX = natural.w / rect.width;
    const scaleY = natural.h / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    setDrag({
      startX: px,
      startY: py,
      origin: { ...box },
    });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const scaleX = natural.w / rect.width;
    const scaleY = natural.h / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const dx = px - drag.startX;
    const dy = py - drag.startY;
    setBox(clampBox({
      ...drag.origin,
      x: drag.origin.x + dx,
      y: drag.origin.y + dy,
    }));
  };

  const onPointerUp = () => setDrag(null);

  const handleConfirm = async () => {
    if (!imgRef.current || !natural.w) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      const maxEdge = 1080;
      const scale = Math.min(1, maxEdge / Math.max(box.width, box.height));
      canvas.width = Math.max(1, Math.round(box.width * scale));
      canvas.height = Math.max(1, Math.round(box.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        imgRef.current,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88);
      });
      if (!blob) throw new Error('تعذّر قص الصورة');
      const base = (file.name || 'image').replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
    } catch (err) {
      console.error(err);
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  if (!open || !file) return null;

  const displayScale = natural.w
    ? Math.min(1, 320 / natural.w, 280 / natural.h)
    : 1;
  const dispW = natural.w * displayScale;
  const dispH = natural.h * displayScale;

  return (
    <div className="crop-backdrop" role="dialog" aria-modal="true" aria-label="قص الصورة">
      <div className="crop-modal">
        <div className="crop-modal__head">
          <h3>تحسين الصورة</h3>
          <button type="button" className="crop-modal__close" onClick={onCancel} aria-label="إغلاق">×</button>
        </div>

        <p className="crop-modal__hint">
          اختر نسبة العرض المناسبة للمتجر، ثم حرّك إطار القص.
        </p>

        <div className="crop-presets">
          {CROP_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={preset === p.id ? 'active' : ''}
              onClick={() => changePreset(p.id)}
            >
              <span>{p.label}</span>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>

        <div
          className="crop-stage"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {objectUrl && (
            <div className="crop-stage__frame" style={{ width: dispW || 'auto', height: dispH || 'auto' }}>
              <img
                ref={imgRef}
                src={objectUrl}
                alt=""
                onLoad={onImageLoad}
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
              {natural.w > 0 && (
                <div
                  className="crop-box"
                  style={{
                    left: `${(box.x / natural.w) * 100}%`,
                    top: `${(box.y / natural.h) * 100}%`,
                    width: `${(box.width / natural.w) * 100}%`,
                    height: `${(box.height / natural.h) * 100}%`,
                  }}
                  onPointerDown={onPointerDown}
                />
              )}
            </div>
          )}
        </div>

        <div className="crop-modal__actions">
          <button type="button" className="crop-btn crop-btn--ghost" onClick={onCancel} disabled={busy}>
            تخطي
          </button>
          <button type="button" className="crop-btn crop-btn--primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'جارٍ التحسين...' : 'تطبيق القص'}
          </button>
        </div>
      </div>
    </div>
  );
}
