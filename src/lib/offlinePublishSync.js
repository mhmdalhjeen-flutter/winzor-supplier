import api from '../services/api';
import { uploadImage } from '../utils/imageUpload';
import { invalidateCatalog } from '../utils/catalogRefresh';
import { queryClient, queryKeys } from './queryClient';
import {
  readPublishQueue,
  updatePublishItem,
  removePublishItem,
  resolveQueueBlob,
} from './offlinePublishQueue';

let processing = false;

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
    const file = blob instanceof File
      ? blob
      : new File([blob], 'offline-image.jpg', { type: blob.type || 'image/jpeg' });
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
  const queue = await readPublishQueue();
  const item = queue.find((i) => i.id === id);
  if (!item) throw new Error('العنصر غير موجود');
  return processOnePublishItem(item);
}

export async function processOfflinePublishQueue() {
  if (processing || !navigator.onLine) return { processed: 0, failed: 0 };
  processing = true;

  let processed = 0;
  let failed = 0;

  try {
    const queue = await readPublishQueue();
    const pending = queue.filter((item) => item.status === 'pending' || item.status === 'failed');

    for (const item of pending) {
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

  return { processed, failed };
}

export function isPublishQueueProcessing() {
  return processing;
}
