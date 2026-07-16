const MAX_EDGE = 1600;
const SKIP_BYTES = 400_000;
const JPEG_QUALITY = 0.85;

/**
 * Downscale large images and export as JPEG when helpful.
 * Returns the original file if already small or optimization fails.
 */
export async function optimizeImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.size <= SKIP_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (!width || !height) {
      bitmap.close?.();
      return file;
    }

    const longEdge = Math.max(width, height);
    const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    if (scale === 1 && file.size <= SKIP_BYTES * 2) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const preferWebp = file.type === 'image/webp' && typeof canvas.toBlob === 'function';
    const mime = preferWebp ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, JPEG_QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const base = (file.name || 'image').replace(/\.[^.]+$/, '');
    const ext = mime === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default optimizeImageFile;
