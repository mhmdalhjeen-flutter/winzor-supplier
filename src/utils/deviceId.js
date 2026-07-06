const DEVICE_ID_KEY = "deviceId";

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function setDeviceId(deviceId) {
  if (deviceId) {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
}

export function clearDeviceId() {
  localStorage.removeItem(DEVICE_ID_KEY);
}
