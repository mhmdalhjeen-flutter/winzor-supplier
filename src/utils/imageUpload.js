const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    reader.readAsDataURL(file);
  });

import { API_URL } from '../lib/apiUrl';

const getUploadImageUrl = () => `${API_URL}/upload/image`;

/** يرفع ملف صورة إلى Cloudinary عبر الباكند ويعيد رابط URL. */
export async function uploadImage(file) {
  if (!file) throw new Error('لم تُختر صورة');
  if (!file.type?.startsWith('image/')) throw new Error('ملف غير صالح');

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(getUploadImageUrl(), {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'فشل رفع الصورة');
  }
  if (!data.url) {
    throw new Error('لم يُرجع الخادم رابط الصورة');
  }

  return data.url;
}

export async function fileToOptimizedDataUrl(file, { maxWidth = 1600, quality = 0.8, thumbnail = false } = {}) {
  if (!file) throw new Error('لم تُختر صورة');
  if (!file.type?.startsWith('image/')) throw new Error('ملف غير صالح');

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }
  if (file.type === 'image/webp' && file.size < 120_000) {
    return readFileAsDataUrl(file);
  }

  const widthLimit = thumbnail ? 320 : maxWidth;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return readFileAsDataUrl(file);
  }

  const scale = Math.min(1, widthLimit / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const toBlob = (type) =>
    new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('تعذّر ضغط الصورة'))), type, quality);
    });

  try {
    const blob = await toBlob('image/webp');
    return readFileAsDataUrl(blob);
  } catch {
    const blob = await toBlob('image/jpeg');
    return readFileAsDataUrl(blob);
  }
}

export default fileToOptimizedDataUrl;
