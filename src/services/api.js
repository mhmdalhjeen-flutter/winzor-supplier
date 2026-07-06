import axios from "axios";
import { redirectToMaintenanceIfNeeded } from "../hooks/useMaintenanceMode";
import { API_URL } from "../lib/apiUrl";
import { getDeviceId } from "../utils/deviceId";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["x-device-id"] = getDeviceId();

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (redirectToMaintenanceIfNeeded(error)) {
      return Promise.reject(error);
    }

    const original = error.config;
    const code = error.response?.data?.code;
    const canRefresh = code === "TOKEN_EXPIRED";

    if (error.response?.status === 401 && canRefresh && !original?._retry) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        original._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
            deviceId: getDeviceId(),
          }, {
            headers: { "x-device-id": getDeviceId() },
          });
          localStorage.setItem("token", data.token);
          if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
          if (data.deviceId) localStorage.setItem("deviceId", data.deviceId);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        } catch {
          /* fall through to logout redirect */
        }
      }
    }

    if (error.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
