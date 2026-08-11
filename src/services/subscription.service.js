import api from './api';

export const getMySubscription = () => api.get('/stores/my/subscription');
export const getSubscriptionPaymentMethods = () => api.get('/stores/my/subscription/payment-methods');
export const submitSubscriptionPayment = (payload) => api.post('/stores/my/subscription/payment', payload);
export const exportSubscriptionPaperCodes = () => api.get('/stores/my/subscription/export-paper-codes', {
  responseType: 'blob',
});
