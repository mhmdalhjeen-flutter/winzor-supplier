import api from "./api";

export const getOffers = () => api.get("/offers");

// عروض متجري (?all=true يشمل المنتهية/المتوقّفة لإتاحة التجديد)
export const getMyOffers = (all = true) =>
  api.get(`/offers/my${all ? "?all=true" : ""}`);

export const getDashboardOffers = (ownLimit = 3, networkLimit = 3) =>
  api.get(`/offers/dashboard?ownLimit=${ownLimit}&networkLimit=${networkLimit}`);

export const createOffer = (data) =>
  api.post("/offers", data);

export const deleteOffer = (id) =>
  api.delete(`/offers/${id}`);

export const toggleOfferActive = (id) =>
  api.patch(`/offers/${id}/toggle-active`);

// تجديد/تمديد عرض (دورة الحياة — المرحلة 6)
export const renewOffer = (id, days) =>
  api.patch(`/offers/${id}/renew`, days ? { days } : {});
