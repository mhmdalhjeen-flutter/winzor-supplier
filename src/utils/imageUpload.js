import api from '../services/api';
import { optimizeImageFile } from './optimizeImageFile';
import { normalizePickedImage } from './imageConvert';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function ensureUploadableFile(file) {
  if (!file) return file;
  const type = file.type || 'image/jpeg';
  const extFromType = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const name = file.name && file.name.includes('.') ? file.name : `photo-${Date.now()}.${extFromType}`;
  if (file.name === name && file.type === type) return file;
  return new File([file], name, { type, lastModified: file.lastModified || Date.now() });
}

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
 * Canonical upload path: File → optimize → POST /upload/image → Cloudinary URL.
 * Uses authenticated axios client (same as other store-owner API calls).
 * Do not set Content-Type on FormData — the browser must add the multipart boundary.
 */
export async function uploadImage(file) {
  if (!file) throw new Error('لم تُختر صورة');

  const converted = await normalizePickedImage(file);
  if (!converted) throw new Error('لم تُختر صورة');

  const prepared = ensureUploadableFile(converted);
  assertValidImageFile(prepared);

  const optimized = await optimizeImageFile(prepared);
  const uploadable = ensureUploadableFile(optimized);
  assertValidImageFile(uploadable);

  const formData = new FormData();
  formData.append('image', uploadable);

  const { data } = await api.post('/upload/image', formData, {
    timeout: 60_000,
    transformRequest: [
      (body, headers) => {
        if (headers) {
          if (typeof headers.delete === 'function') {
            headers.delete('Content-Type');
          } else {
            delete headers['Content-Type'];
          }
        }
        return body;
      },
    ],
  });

  if (!data?.url) {
    throw new Error(data?.message || 'لم يُرجع الخادم رابط الصورة');
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
