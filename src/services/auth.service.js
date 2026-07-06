import api from "./api";

// تسجيل الدخول
export const login = (data) => api.post("/auth/login", data);

// تسجيل حساب
export const register = (data) =>
  api.post("/auth/register-business", data);