import { useEffect, useRef, useState } from 'react';
import { RotateCw, Sparkles, Sun, Contrast, Droplets, Focus, Undo2 } from 'lucide-react';

/** Suggested store-display aspect ratios */
export const CROP_PRESETS = [
  { id: 'square', label: 'مربع 1:1', ratio: 1, hint: 'موصى به لعرض المتجر' },
  { id: 'portrait', label: 'عمودي 4:5', ratio: 4 / 5, hint: 'مناسب للمنشورات' },
  { id: 'landscape', label: 'أفقي 16:9', ratio: 16 / 9, hint: 'بانر / غلاف' },
  { id: 'free', label: 'حر', ratio: null, hint: 'بدون قص محدد' },
];

const DEFAULT_ADJUST = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpen: 0,
};

function clampBox(next, natural) {
  const { w, h } = natural;
  let { x, y, width, height } = next;
  width = Math.max(40, Math.min(width, w));
  height = Math.max(40, Math.min(height, h));
  x = Math.max(0, Math.min(x, w - width));
  y = Math.max(0, Math.min(y, h - height));
  return { x, y, width, height };
}

function initBox(w, h, ratioId) {
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
  return {
    x: (w - width) / 2,
    y: (h - height) / 2,
    width,
    height,
  };
}

function drawRotatedImage(ctx, img, rotation) {
  const r = ((rotation % 360) + 360) % 360;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (r === 90 || r === 270) {
    ctx.canvas.width = h;
    ctx.canvas.height = w;
  } else {
    ctx.canvas.width = w;
    ctx.canvas.height = h;
  }
  ctx.save();
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate((r * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();
}

function applySharpen(ctx, amount) {
  if (!amount) return;
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const kernel = [0, -1, 0, -1, 5 + amount * 0.08, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki];
            ki += 1;
          }
        }
        out[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  ctx.putImageData(new ImageData(out, width, height), 0, 0);
}

/**
 * Canvas crop + lightweight adjustments before upload. Returns a File (JPEG).
 */
export default function ImageCropModal({ file, open, onCancel, onConfirm }) {
  const imgRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [preset, setPreset] = useState('square');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);
  const [imgKey, setImgKey] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open || !file) return undefined;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setPreset('square');
    setAdjust(DEFAULT_ADJUST);
    setZoom(1);
    setImgKey(0);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const onImageLoad = (e) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    setBox(initBox(w, h, preset));
  };

  const changePreset = (id) => {
    setPreset(id);
    if (natural.w && natural.h) setBox(initBox(natural.w, natural.h, id));
  };

  const rotateImage = async () => {
    const img = imgRef.current;
    if (!img || !natural.w || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      drawRotatedImage(ctx, img, 90);
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      if (!blob) return;
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setImgKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const resetAdjustments = () => {
    setAdjust(DEFAULT_ADJUST);
    setZoom(1);
  };

  const autoEnhance = () => {
    setAdjust({ brightness: 108, contrast: 112, saturation: 108, sharpen: 35 });
  };

  const autoBrightness = () => {
    setAdjust((prev) => ({ ...prev, brightness: 115 }));
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
    setDrag({ startX: px, startY: py, origin: { ...box } });
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
    setBox(clampBox({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy }, natural));
  };

  const onPointerUp = () => setDrag(null);

  const handleConfirm = async () => {
    if (!imgRef.current || !natural.w) return;
    setBusy(true);
    try {
      const cropCanvas = document.createElement('canvas');
      const cropX = Math.round(box.x);
      const cropY = Math.round(box.y);
      const cropW = Math.round(box.width);
      const cropH = Math.round(box.height);

      const maxEdge = 1600;
      const outScale = Math.min(1, maxEdge / Math.max(cropW, cropH));
      cropCanvas.width = Math.max(1, Math.round(cropW * outScale));
      cropCanvas.height = Math.max(1, Math.round(cropH * outScale));
      const ctx = cropCanvas.getContext('2d');

      ctx.filter = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;
      ctx.drawImage(
        imgRef.current,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height,
      );
      ctx.filter = 'none';
      applySharpen(ctx, adjust.sharpen);

      const blob = await new Promise((resolve) => {
        cropCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });
      if (!blob) throw new Error('تعذّر قص الصورة');
      const base = (file.name || 'image').replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${base}-edited.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
    } catch (err) {
      console.error(err);
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  if (!open || !file) return null;

  const displayScale = natural.w
    ? Math.min(1, 480 / natural.w, 520 / natural.h)
    : 1;
  const dispW = natural.w * displayScale;
  const dispH = natural.h * displayScale;

  const filterStyle = {
    filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`,
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    transition: 'filter 0.2s ease, transform 0.15s ease',
  };

  return (
    <div className="crop-backdrop" role="dialog" aria-modal="true" aria-label="تحسين الصورة">
      <div className="crop-modal crop-modal--enhanced">
        <div className="crop-modal__head">
          <h3>تحسين الصورة</h3>
          <button type="button" className="crop-modal__close" onClick={onCancel} aria-label="إغلاق">×</button>
        </div>

        <p className="crop-modal__hint">
          اضبط القص والإضاءة — التغييرات تظهر مباشرة على المعاينة.
        </p>

        <div className="crop-presets crop-presets--compact">
          {CROP_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={preset === p.id ? 'active' : ''}
              onClick={() => changePreset(p.id)}
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="crop-toolbar">
          <button type="button" className="crop-tool-btn" onClick={rotateImage} title="تدوير">
            <RotateCw size={18} strokeWidth={2} />
            <span>تدوير</span>
          </button>
          <button type="button" className="crop-tool-btn" onClick={autoEnhance} title="تحسين تلقائي">
            <Sparkles size={18} strokeWidth={2} />
            <span>تلقائي</span>
          </button>
          <button type="button" className="crop-tool-btn" onClick={autoBrightness} title="سطوع تلقائي">
            <Sun size={18} strokeWidth={2} />
            <span>سطوع</span>
          </button>
          <button type="button" className="crop-tool-btn" onClick={resetAdjustments} title="إعادة ضبط">
            <Undo2 size={18} strokeWidth={2} />
            <span>إعادة</span>
          </button>
        </div>

        <div
          className="crop-stage crop-stage--large"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {objectUrl && (
            <div className="crop-stage__frame" style={{ width: dispW || 'auto', height: dispH || 'auto' }}>
              <img
                key={imgKey}
                ref={imgRef}
                src={objectUrl}
                alt=""
                onLoad={onImageLoad}
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', ...filterStyle }}
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

        <div className="crop-sliders">
          <label className="crop-slider">
            <span>تكبير</span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <label className="crop-slider">
            <span><Sun size={14} /> سطوع</span>
            <input
              type="range"
              min="70"
              max="140"
              value={adjust.brightness}
              onChange={(e) => setAdjust((a) => ({ ...a, brightness: Number(e.target.value) }))}
            />
          </label>
          <label className="crop-slider">
            <span><Contrast size={14} /> تباين</span>
            <input
              type="range"
              min="70"
              max="140"
              value={adjust.contrast}
              onChange={(e) => setAdjust((a) => ({ ...a, contrast: Number(e.target.value) }))}
            />
          </label>
          <label className="crop-slider">
            <span><Droplets size={14} /> تشبّع</span>
            <input
              type="range"
              min="70"
              max="140"
              value={adjust.saturation}
              onChange={(e) => setAdjust((a) => ({ ...a, saturation: Number(e.target.value) }))}
            />
          </label>
          <label className="crop-slider">
            <span><Focus size={14} /> حدة</span>
            <input
              type="range"
              min="0"
              max="100"
              value={adjust.sharpen}
              onChange={(e) => setAdjust((a) => ({ ...a, sharpen: Number(e.target.value) }))}
            />
          </label>
        </div>

        <div className="crop-modal__actions">
          <button type="button" className="crop-btn crop-btn--ghost" onClick={onCancel} disabled={busy}>
            تخطي
          </button>
          <button type="button" className="crop-btn crop-btn--primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'جارٍ التحسين...' : 'تطبيق'}
          </button>
        </div>
      </div>
    </div>
  );
}
