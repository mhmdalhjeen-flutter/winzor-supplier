import api from './api';

export function getMyItemCategories() {
  return api.get('/stores/my/item-categories');
}

export function createItemCategory(payload) {
  return api.post('/stores/my/item-categories', payload);
}

export function updateItemCategory(id, payload) {
  return api.patch(`/stores/my/item-categories/${id}`, payload);
}

export function deleteItemCategory(id) {
  return api.delete(`/stores/my/item-categories/${id}`);
}
