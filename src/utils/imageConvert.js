/**
 * Normalize camera/gallery picks — converts HEIC/HEIF to JPEG when the browser cannot decode them.
 */
export async function normalizePickedImage(rawFile) {
  if (!rawFile) return null;

  const name = rawFile.name || `photo-${Date.now()}.jpg`;
  const type = (rawFile.type || '').toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const isHeic = type.includes('heic')
    || type.includes('heif')
    || ext === 'heic'
    || ext === 'heif';

  if (!isHeic) return rawFile;

  try {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: rawFile,
      toType: 'image/jpeg',
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!blob) throw new Error('HEIC conversion failed');
    const base = name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    throw new Error('تعذّر قراءة صورة HEIC — جرّب JPG أو PNG');
  }
}

export default normalizePickedImage;
