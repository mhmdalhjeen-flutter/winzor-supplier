import api from "../services/api";
import { getStoredUser } from "./safeStorage";
import { setDeviceId, clearDeviceId, getDeviceId } from "./deviceId";
import { clearSettingsCache } from "./settingsCache";

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

export const logout = () => {
  const token = localStorage.getItem("token");
  const deviceId = getDeviceId();

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  clearSettingsCache();
  clearDeviceId();

  if (token) {
    api.post("/auth/logout", {}, {
      headers: { "x-device-id": deviceId },
      timeout: 4000,
    }).catch(() => {});
  }
};
