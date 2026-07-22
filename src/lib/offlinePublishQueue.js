import { get, set } from 'idb-keyval';

const QUEUE_KEY = 'store-owner-offline-publish-v1';

function newId() {
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function readPublishQueue() {
  const list = await get(QUEUE_KEY);
  return Array.isArray(list) ? list : [];
}

async function writePublishQueue(list) {
  await set(QUEUE_KEY, list);
  window.dispatchEvent(new CustomEvent('offline-publish-queue-changed'));
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
    imageBlob,
    imagePreviewUrl,
    remoteImageUrl: remoteImageUrl || '',
    status: 'pending',
    error: null,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  const queue = await readPublishQueue();
  queue.push(item);
  await writePublishQueue(queue);
  return item;
}

export async function updatePublishItem(id, patch) {
  const queue = await readPublishQueue();
  const next = queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await writePublishQueue(next);
  return next.find((item) => item.id === id) || null;
}

export async function removePublishItem(id) {
  const queue = await readPublishQueue();
  await writePublishQueue(queue.filter((item) => item.id !== id));
}

export async function getPendingPublishCount() {
  const queue = await readPublishQueue();
  return queue.filter((item) => item.status === 'pending' || item.status === 'uploading' || item.status === 'failed').length;
}
