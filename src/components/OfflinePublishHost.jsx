import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import api from '../services/api';
import { uploadImage } from '../utils/imageUpload';
import { invalidateCatalog } from '../utils/catalogRefresh';
import { queryClient, queryKeys } from '../lib/queryClient';
import {
  readPublishQueue,
  updatePublishItem,
  removePublishItem,
} from '../lib/offlinePublishQueue';

let processing = false;

async function processOneItem(item) {
  if (item.status === 'synced') return;

  await updatePublishItem(item.id, { status: 'uploading', attempts: (item.attempts || 0) + 1 });

  let imageUrl = item.remoteImageUrl || item.payload?.image || '';

  if (!imageUrl && item.imageBlob) {
    const file = item.imageBlob instanceof Blob
      ? new File([item.imageBlob], 'offline-image.jpg', { type: item.imageBlob.type || 'image/jpeg' })
      : null;
    if (!file) throw new Error('الصورة المحلية غير متوفرة');
    imageUrl = await uploadImage(file);
  }

  if (!imageUrl) throw new Error('صورة المنشور مطلوبة');

  const payload = { ...item.payload, image: imageUrl };

  if (item.type === 'product') {
    await api.post('/products', payload);
    queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
  } else if (item.type === 'offer') {
    await api.post('/offers', payload);
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffers });
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
  } else {
    throw new Error('نوع غير معروف');
  }

  invalidateCatalog(queryClient);
  await removePublishItem(item.id);
}

export async function processOfflinePublishQueue() {
  if (processing || !navigator.onLine) return;
  processing = true;

  try {
    const queue = await readPublishQueue();
    const pending = queue.filter((item) => item.status === 'pending' || item.status === 'failed');

    for (const item of pending) {
      try {
        await processOneItem(item);
      } catch (err) {
        await updatePublishItem(item.id, {
          status: 'failed',
          error: err?.message || 'فشل الرفع',
        });
      }
    }
  } finally {
    processing = false;
  }
}

export default function OfflinePublishHost() {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = async () => {
    const queue = await readPublishQueue();
    setPendingCount(queue.filter((i) => i.status !== 'synced').length);
  };

  useEffect(() => {
    refreshCount();

    const onOnline = () => {
      processOfflinePublishQueue().finally(refreshCount);
    };

    const onQueueChange = () => refreshCount();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline-publish-queue-changed', onQueueChange);
    onlineManager.subscribe((online) => {
      if (online) onOnline();
    });

    if (navigator.onLine) {
      processOfflinePublishQueue().finally(refreshCount);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline-publish-queue-changed', onQueueChange);
    };
  }, []);

  if (pendingCount <= 0) return null;

  return (
    <div className="offline-publish-banner" role="status">
      <span className="offline-publish-banner__dot" />
      {pendingCount === 1
        ? 'منشور واحد بانتظار الرفع — سيُرفع تلقائياً عند توفر الإنترنت'
        : `${pendingCount} منشورات بانتظار الرفع — سيتم رفعها تلقائياً عند توفر الإنترنت`}
    </div>
  );
}
