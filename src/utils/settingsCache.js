import { parseStoredJson } from './safeStorage';

const MY_STORE_KEY = 'store-owner-my-store-cache-v1';
const PAYMENT_KEY = 'store-owner-payment-methods-cache-v1';

function readObject(key) {
  const data = parseStoredJson(key, null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  return data;
}

function writeObject(key, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function readCachedMyStore() {
  return readObject(MY_STORE_KEY);
}

export function writeCachedMyStore(data) {
  writeObject(MY_STORE_KEY, data);
}

export function readCachedPaymentMethods() {
  return readObject(PAYMENT_KEY);
}

export function writeCachedPaymentMethods(data) {
  writeObject(PAYMENT_KEY, data);
}

export function clearSettingsCache() {
  try {
    localStorage.removeItem(MY_STORE_KEY);
    localStorage.removeItem(PAYMENT_KEY);
  } catch {
    /* ignore */
  }
}
