import api from '../services/api';
import { uploadImage } from '../utils/imageUpload';
import { normalizePickedImage } from '../utils/imageConvert';
import { invalidateCatalog } from '../utils/catalogRefresh';
import { queryClient, queryKeys } from './queryClient';
import {
  readPublishQueue,
  updatePublishItem,
  removePublishItem,
  resolveQueueBlob,
  recoverStaleQueueItems,
} from './offlinePublishQueue';

let processing = false;
let processingStartedAt = 0;
const PROCESSING_STALE_MS = 2 * 60 * 1000;

function hasAuthToken() {
  return Boolean(localStorage.getItem('token'));
}

async function blobToUploadableFile(blob) {
  const raw = blob instanceof File
    ? blob
    : new File([blob], blob.name || 'offline-image.jpg', { type: blob.type || 'image/jpeg' });
  const converted = await normalizePickedImage(raw);
  const type = converted.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const name = converted.name?.includes('.') ? converted.name : `offline-${Date.now()}.${ext}`;
  if (converted.name === name && converted.type === type) return converted;
  return new File([converted], name, { type, lastModified: Date.now() });
}

export function showAppToast(text, type = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { text, type } }));
}

function insertCreatedItem(type, entity) {
  if (!entity?._id) return;

  if (type === 'product') {
    queryClient.setQueryData(queryKeys.myProducts, (prev = []) => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.some((p) => p._id === entity._id)) return list;
      return [entity, ...list];
    });
  } else if (type === 'offer') {
    const upsert = (prev = []) => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.some((o) => o._id === entity._id)) return list;
      return [entity, ...list];
    };
    queryClient.setQueryData(queryKeys.myOffersAll, upsert);
    queryClient.setQueryData(queryKeys.myOffers, upsert);
  }
}

export async function processOnePublishItem(item) {
  if (!item || item.status === 'synced') return { ok: true, skipped: true };

  await updatePublishItem(item.id, {
    status: 'uploading',
    attempts: (item.attempts || 0) + 1,
  });

  let imageUrl = item.remoteImageUrl || item.payload?.image || '';

  if (!imageUrl) {
    const blob = await resolveQueueBlob(item.imageBlob);
    if (!blob) throw new Error('الصورة المحلية غير متوفرة — أعد اختيار الصورة');
    const file = await blobToUploadableFile(blob);
    imageUrl = await uploadImage(file);
  }

  if (!imageUrl) throw new Error('صورة المنشور مطلوبة');

  const payload = { ...item.payload, image: imageUrl };
  let created = null;

  if (item.type === 'product') {
    const { data } = await api.post('/products', payload);
    created = data.product || data;
    insertCreatedItem('product', created);
    queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
  } else if (item.type === 'offer') {
    const { data } = await api.post('/offers', payload);
    created = data.offer || data;
    insertCreatedItem('offer', created);
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffers });
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
  } else {
    throw new Error('نوع غير معروف');
  }

  invalidateCatalog(queryClient);
  await removePublishItem(item.id);

  const label = item.type === 'product'
    ? (item.payload?.name || 'المنتج')
    : (item.payload?.title || 'العرض');
  showAppToast(`تم رفع «${label}» بنجاح`, 'success');

  return { ok: true, created, type: item.type };
}

export async function uploadPublishItemById(id) {
  await recoverStaleQueueItems();
  const queue = await readPublishQueue();
  const item = queue.find((i) => i.id === id);
  if (!item) throw new Error('العنصر غير موجود');
  return processOnePublishItem(item);
}

export async function processOfflinePublishQueue() {
  if (!navigator.onLine) return { processed: 0, failed: 0, skipped: true };
  if (!hasAuthToken()) return { processed: 0, failed: 0, skipped: true };

  if (processing) {
    if (Date.now() - processingStartedAt < PROCESSING_STALE_MS) {
      return { processed: 0, failed: 0, skipped: true };
    }
    processing = false;
  }

  await recoverStaleQueueItems();

  processing = true;
  processingStartedAt = Date.now();

  let processed = 0;
  let failed = 0;

  try {
    const queue = await readPublishQueue();
    const pending = queue.filter(
      (item) => item.status === 'pending' || item.status === 'failed' || item.status === 'uploading',
    );

    for (const item of pending) {
      if (!navigator.onLine) break;
      try {
        await processOnePublishItem(item);
        processed += 1;
      } catch (err) {
        failed += 1;
        await updatePublishItem(item.id, {
          status: 'failed',
          error: err?.response?.data?.message || err?.message || 'فشل الرفع',
        });
      }
    }
  } finally {
    processing = false;
  }

  if (processed > 0 || failed > 0) {
    window.dispatchEvent(new CustomEvent('offline-publish-queue-changed'));
  }

  return { processed, failed };
}

export function isOfflinePublishSyncing() {
  return processing;
}

export function isPublishQueueProcessing() {
  return processing;
}
