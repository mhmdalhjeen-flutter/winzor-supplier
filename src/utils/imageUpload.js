import { API_URL } from '../lib/apiUrl';

const getUploadImageUrl = () => `${API_URL}/upload/image`;

/**
 * Canonical upload path (React + Flutter share this contract):
 * File → POST /api/upload/image → Cloudinary → HTTPS URL → save URL in MongoDB.
 */
export async function uploadImage(file) {
  if (!file) throw new Error('لم تُختر صورة');
  if (!file.type?.startsWith('image/')) throw new Error('ملف غير صالح');
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.type)) {
    throw new Error('نوع الملف غير مسموح — jpg, png, webp فقط');
  }

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

/** Upload multiple images; returns HTTPS URLs in order. */
export async function uploadImages(files) {
  const list = Array.from(files || []).filter(Boolean);
  const urls = [];
  for (const file of list) {
    urls.push(await uploadImage(file));
  }
  return urls;
}

export default uploadImage;
