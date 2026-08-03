const DRAFTS_KEY = 'store-form-drafts-v2';

function newDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function getDraft(id) {
  return listDrafts().find((d) => d.id === id) || null;
}

export function saveDraftEntry({ id, type, data, title, imagePreview }) {
  const now = new Date().toISOString();
  const list = listDrafts();
  const entry = {
    id: id || newDraftId(),
    type,
    data,
    title: title || (type === 'product' ? 'مسودة عنصر' : 'مسودة عرض'),
    imagePreview: imagePreview || data?.image || '',
    updatedAt: now,
    createdAt: id ? (list.find((d) => d.id === id)?.createdAt || now) : now,
  };

  const next = id
    ? list.map((d) => (d.id === id ? entry : d))
    : [entry, ...list];

  localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
  return entry;
}

export function deleteDraft(id) {
  const next = listDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
}

export function getDraftsCount() {
  return listDrafts().length;
}
