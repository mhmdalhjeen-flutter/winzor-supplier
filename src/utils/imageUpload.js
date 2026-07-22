import { API_URL } from '../lib/apiUrl';
import { optimizeImageFile } from './optimizeImageFile';

const getUploadImageUrl = () => `${API_URL}/upload/image`;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function assertValidImageFile(file) {
  if (!file) throw new Error('لم تُختر صورة');
  if (!file.type?.startsWith('image/')) throw new Error('ملف غير صالح');
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('نوع الملف غير مسموح — jpg, jpeg, png, webp فقط');
  }
  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (ext && file.name.includes('.') && !ALLOWED_EXT.has(ext)) {
    throw new Error('نوع الملف غير مسموح — jpg, jpeg, png, webp فقط');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('حجم الصورة كبير جداً — الحد الأقصى 5 ميجابايت');
  }
}

/**
 * Canonical upload path (React + Flutter share this contract):
 * File → optimize → POST /api/upload/image → Cloudinary → HTTPS URL → save URL in MongoDB.
 */
export async function uploadImage(file) {
  assertValidImageFile(file);

  const optimized = await optimizeImageFile(file);
  assertValidImageFile(optimized);

  const formData = new FormData();
  formData.append('image', optimized);

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
