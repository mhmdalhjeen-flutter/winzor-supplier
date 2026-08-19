import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readCachedMyStore,
  writeCachedMyStore,
  readCachedPaymentMethods,
  writeCachedPaymentMethods,
  clearSettingsCache,
} from '../src/utils/settingsCache.js';

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

installLocalStorage();

test('my-store cache round-trips the last successful settings payload', () => {
  clearSettingsCache();
  assert.equal(readCachedMyStore(), undefined);
  writeCachedMyStore({ store: { name: 'متجر الاختبار', isOpen: true } });
  assert.equal(readCachedMyStore().store.name, 'متجر الاختبار');
  clearSettingsCache();
  assert.equal(readCachedMyStore(), undefined);
});

test('payment-methods cache is independent of my-store cache', () => {
  clearSettingsCache();
  writeCachedMyStore({ store: { name: 'A' } });
  writeCachedPaymentMethods({ methods: [{ type: 'cash' }], paymentMethods: { cash: { enabled: true } } });
  assert.equal(readCachedMyStore().store.name, 'A');
  assert.equal(readCachedPaymentMethods().methods[0].type, 'cash');
});
