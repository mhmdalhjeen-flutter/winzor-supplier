import api from './api';

export const getMyPaymentMethods = () => api.get('/stores/my/payment-methods');

export const updatePaymentMethodToggles = (paymentMethods) =>
  api.patch('/stores/my/payment-methods/toggles', { paymentMethods });

export const createPaymentMethod = (payload) => api.post('/stores/my/payment-methods', payload);

export const updatePaymentMethod = (id, payload) => api.patch(`/stores/my/payment-methods/${id}`, payload);

export const activatePaymentMethod = (id) => api.patch(`/stores/my/payment-methods/${id}/activate`);

export const deletePaymentMethod = (id) => api.delete(`/stores/my/payment-methods/${id}`);
