import api from "../services/api";
import { getStoredUser } from "./safeStorage";
import { setDeviceId, clearDeviceId, getDeviceId } from "./deviceId";

export const setAuth = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }
  if (data.deviceId) {
    setDeviceId(data.deviceId);
  }
};

export const getUser = () => getStoredUser(null);

export const getRole = () => getStoredUser(null)?.role ?? null;

export const logout = async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      await api.post("/auth/logout", {}, {
        headers: { "x-device-id": getDeviceId() },
      });
    } catch {
      /* مسح محلي حتى لو فشل الخادم */
    }
  }

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  clearDeviceId();
};
