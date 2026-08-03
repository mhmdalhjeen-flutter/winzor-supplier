import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Mobile-style image cropper: drag to move, pinch to zoom, fixed crop frame.
 */
export default function ImageCropModal({ file, open, onCancel, onConfirm }) {
  const containerRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  useEffect(() => {
    if (!open || !file) return undefined;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const onImageLoad = (e) => {
    setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const clampOffset = useCallback((nextOffset, nextZoom) => {
    const frame = containerRef.current;
    if (!frame || !natural.w) return nextOffset;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const scale = Math.max(fw / natural.w, fh / natural.h) * nextZoom;
    const dw = natural.w * scale;
    const dh = natural.h * scale;
    const maxX = Math.max(0, (dw - fw) / 2);
    const maxY = Math.max(0, (dh - fh) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nextOffset.x)),
      y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
    };
  }, [natural]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' && pinchRef.current) return;
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...offset },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setOffset(clampOffset({ x: drag.origin.x + dx, y: drag.origin.y + dy }, zoom));
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  useEffect(() => {
    if (!open) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        pinchRef.current = {
          dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
          zoom,
          offset: { ...offset },
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
        dragRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const ratio = dist / pinchRef.current.dist;
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.zoom * ratio));
      setZoom(nextZoom);
      setOffset(clampOffset(pinchRef.current.offset, nextZoom));
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [open, zoom, offset, clampOffset]);

  const handleConfirm = async () => {
    if (!natural.w || !objectUrl) return;
    setBusy(true);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const frame = containerRef.current;
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      const baseScale = Math.max(fw / natural.w, fh / natural.h);
      const scale = baseScale * zoom;

      const canvas = document.createElement('canvas');
      canvas.width = fw;
      canvas.height = fh;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, fw, fh);

      const drawW = natural.w * scale;
      const drawH = natural.h * scale;
      const dx = (fw - drawW) / 2 + offset.x;
      const dy = (fh - drawH) / 2 + offset.y;

      ctx.drawImage(img, dx, dy, drawW, drawH);

      const maxEdge = 1600;
      const outScale = Math.min(1, maxEdge / Math.max(fw, fh));
      let outCanvas = canvas;
      if (outScale < 1) {
        outCanvas = document.createElement('canvas');
        outCanvas.width = Math.round(fw * outScale);
        outCanvas.height = Math.round(fh * outScale);
        outCanvas.getContext('2d').drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);
      }

      const blob = await new Promise((resolve) => {
        outCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
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

  const baseScale = natural.w && containerRef.current
    ? Math.max(containerRef.current.clientWidth / natural.w, containerRef.current.clientHeight / natural.h)
    : 1;

  return (
    <div className="mobile-crop-backdrop" role="dialog" aria-modal="true" aria-label="قص الصورة">
      <div className="mobile-crop-modal">
        <div
          ref={containerRef}
          className="mobile-crop-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {objectUrl && (
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              className="mobile-crop-image"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${baseScale * zoom})`,
              }}
            />
          )}
          <div className="mobile-crop-frame" aria-hidden />
        </div>

        <div className="mobile-crop-actions">
          <button type="button" className="mobile-crop-btn mobile-crop-btn--ghost" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
          <button type="button" className="mobile-crop-btn mobile-crop-btn--primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'جارٍ المعالجة...' : 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
}
