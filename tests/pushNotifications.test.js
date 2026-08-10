/**
 * Store push subscription sync control-flow tests.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

function installLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
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
  return store;
}

installLocalStorage();
globalThis.Notification = { permission: 'granted' };
globalThis.PushManager = function PushManager() {};
globalThis.navigator = {
  serviceWorker: { ready: Promise.resolve({ pushManager: {} }) },
};
globalThis.window = globalThis;

import {
  ensurePushSubscriptionSynced,
  SUBSCRIPTION_STATUS_KEY,
  PUSH_APP,
} from '../src/pwa/pushNotifications.js';

const MOCK_SUBSCRIPTION = {
  endpoint: 'https://push.example.test/subscriber/store-abc',
  toJSON() {
    return {
      endpoint: this.endpoint,
      expirationTime: null,
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    };
  },
};

function createDeps(overrides = {}) {
  const postCalls = [];
  const syncWithBackend = overrides.syncWithBackend
    ?? (async (sub) => {
      postCalls.push({
        app: PUSH_APP,
        platform: 'web',
        subscription: sub.toJSON(),
      });
      localStorage.setItem(SUBSCRIPTION_STATUS_KEY, '1');
    });

  const registration = { pushManager: {} };
  let subscription = 'initialSubscription' in overrides
    ? overrides.initialSubscription
    : MOCK_SUBSCRIPTION;

  return {
    deps: {
      getToken: overrides.getToken ?? (() => localStorage.getItem('token')),
      getRegistration: async () => registration,
      getSubscription: async () => subscription,
      createSubscription: async () => {
        throw new Error('createSubscription should not run when subscription exists');
      },
      syncWithBackend,
      fetchPublicKey: async () => {
        throw new Error('fetchPublicKey should not run when subscription exists');
      },
      getPermission: () => 'granted',
      requestPermission: async () => 'granted',
    },
    postCalls,
  };
}

test('store: existing PushSubscription + null localStorage → POST with app store', async () => {
  installLocalStorage({ token: 'store-jwt' });
  const { deps, postCalls } = createDeps({ initialSubscription: MOCK_SUBSCRIPTION });

  const result = await ensurePushSubscriptionSynced(deps);

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'synced_existing');
  assert.equal(postCalls.length, 1);
  assert.equal(postCalls[0].app, 'store');
});

test('store: existing PushSubscription + localStorage flag → still POST subscribe', async () => {
  installLocalStorage({ token: 'store-jwt', [SUBSCRIPTION_STATUS_KEY]: '1' });
  const { deps, postCalls } = createDeps({ initialSubscription: MOCK_SUBSCRIPTION });

  const result = await ensurePushSubscriptionSynced(deps);

  assert.equal(result.ok, true);
  assert.equal(postCalls.length, 1);
  assert.equal(postCalls[0].app, 'store');
});

test('store: failed backend sync clears localStorage flag', async () => {
  installLocalStorage({ token: 'store-jwt', [SUBSCRIPTION_STATUS_KEY]: '1' });
  const { deps } = createDeps({
    initialSubscription: MOCK_SUBSCRIPTION,
    syncWithBackend: async () => {
      throw new Error('backend rejected');
    },
  });

  const result = await ensurePushSubscriptionSynced(deps);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'backend_subscribe_failed');
  assert.equal(localStorage.getItem(SUBSCRIPTION_STATUS_KEY), null);
});
