import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'store-owner-offline-publish-v1';
const STALE_UPLOAD_MS = 45 * 1000;

function newId() {
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function serializeBlob(blob) {
  if (!blob) return null;
  if (blob.buffer && blob.type !== undefined && !(blob instanceof Blob)) {
    return blob;
  }
  if (!(blob instanceof Blob)) return null;
  const buffer = await blob.arrayBuffer();
  return {
    buffer,
    type: blob.type || 'image/jpeg',
    name: blob.name || `offline-${Date.now()}.jpg`,
  };
}

export async function resolveQueueBlob(stored) {
  if (!stored) return null;
  if (stored instanceof Blob) return stored;
  if (stored.buffer) {
    return new File(
      [stored.buffer],
      stored.name || 'offline-image.jpg',
      { type: stored.type || 'image/jpeg' },
    );
  }
  return null;
}

export async function readPublishQueue() {
  const list = await get(QUEUE_KEY);
  return Array.isArray(list) ? list : [];
}

export async function getPublishItem(id) {
  const queue = await readPublishQueue();
  return queue.find((item) => item.id === id) || null;
}

async function writePublishQueue(list) {
  await set(QUEUE_KEY, list);
  window.dispatchEvent(new CustomEvent('offline-publish-queue-changed'));
}

export function requestOfflinePublishSync() {
  window.dispatchEvent(new CustomEvent('offline-publish-sync-request'));
}

/** Reset items stuck in uploading state after app crash / tab close. */
export async function recoverStaleQueueItems() {
  const queue = await readPublishQueue();
  const now = Date.now();
  let changed = false;

  const next = queue.map((item) => {
    if (item.status !== 'uploading') return item;
    const touched = item.updatedAt || item.createdAt;
    const age = touched ? now - new Date(touched).getTime() : STALE_UPLOAD_MS + 1;
    if (age > STALE_UPLOAD_MS) {
      changed = true;
      return {
        ...item,
        status: 'pending',
        error: null,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });

  if (changed) await writePublishQueue(next);
  return changed;
}

export async function enqueuePublishItem({
  type,
  payload,
  imageBlob = null,
  imagePreviewUrl = '',
  remoteImageUrl = '',
}) {
  const item = {
    id: newId(),
    type,
    payload,
    imageBlob: await serializeBlob(imageBlob),
    imagePreviewUrl,
    remoteImageUrl: remoteImageUrl || '',
    status: 'pending',
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0,
  };

  const queue = await readPublishQueue();
  queue.push(item);
  await writePublishQueue(queue);
  requestOfflinePublishSync();
  return item;
}

export async function updatePublishItem(id, patch) {
  const queue = await readPublishQueue();
  const nextPatch = {
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (patch.imageBlob !== undefined) {
    nextPatch.imageBlob = await serializeBlob(patch.imageBlob);
  }
  const next = queue.map((item) => (item.id === id ? { ...item, ...nextPatch } : item));
  await writePublishQueue(next);
  const updated = next.find((item) => item.id === id) || null;
  if (patch.status === 'pending' || patch.status === 'failed') {
    requestOfflinePublishSync();
  }
  return updated;
}

export async function removePublishItem(id) {
  const queue = await readPublishQueue();
  await writePublishQueue(queue.filter((item) => item.id !== id));
}

export async function getPendingPublishCount() {
  const queue = await readPublishQueue();
  return queue.filter(
    (item) => item.status === 'pending' || item.status === 'uploading' || item.status === 'failed',
  ).length;
}

export async function getPreviewUrlForItem(item) {
  if (item.imagePreviewUrl) return item.imagePreviewUrl;
  if (item.remoteImageUrl) return item.remoteImageUrl;
  if (item.payload?.image) return item.payload.image;
  const blob = await resolveQueueBlob(item.imageBlob);
  if (blob) return URL.createObjectURL(blob);
  return '';
}

export function getItemTitle(item) {
  if (!item) return '';
  if (item.type === 'product') return item.payload?.name || 'منتج بدون اسم';
  return item.payload?.title || 'عرض بدون اسم';
}
