import api from "./api";

export const getMyStore = () => api.get("/stores/my");
export const updateMyStore = (payload) => api.patch("/stores/my", payload);
export const applyDefaultBranding = () => api.post("/stores/my/apply-default-branding");
export const dismissBrandingWelcome = () => api.post("/stores/my/dismiss-branding-welcome");
