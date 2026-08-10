import api from '../services/api';

export const PUSH_APP = 'store';
export const SUBSCRIPTION_STATUS_KEY = 'store-push-subscribed-v1';
const PERMISSION_PROMPTED_KEY = 'store-push-permission-prompted-v1';

function isDebugEnabled() {
  try {
    return import.meta.env.DEV || localStorage.getItem('store-push-debug') === '1';
  } catch {
    return false;
  }
}

/** Safe client-side diagnostics — never logs subscription keys or endpoints. */
export function logPushDiagnostic(event, details = {}) {
  const payload = { event, app: PUSH_APP, ...details };
  if (details.ok === false || details.level === 'error') {
    console.warn('[WinGold Store Push]', payload);
    return;
  }
  if (isDebugEnabled()) {
    console.info('[WinGold Store Push]', payload);
  }
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  );
}

export function getSubscriptionStatusFlag() {
  try {
    return localStorage.getItem(SUBSCRIPTION_STATUS_KEY) === '1';
  } catch {
    return false;
  }
}

function setSubscriptionStatus(active) {
  try {
    if (active) {
      localStorage.setItem(SUBSCRIPTION_STATUS_KEY, '1');
    } else {
      localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    }
  } catch {
    /* ignore */
  }
}

function markPermissionPrompted() {
  try {
    localStorage.setItem(PERMISSION_PROMPTED_KEY, '1');
  } catch {
    /* ignore */
  }
}

function wasPermissionPrompted() {
  try {
    return localStorage.getItem(PERMISSION_PROMPTED_KEY) === '1';
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey() {
  const { data } = await api.get('/notifications/push/public-key');
  if (!data?.publicKey) {
    logPushDiagnostic('vapid_public_key_missing', {
      ok: false,
      configured: data?.configured === false,
      status: data?.message || 'missing_public_key',
    });
    return null;
  }
  return data.publicKey;
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  if (wasPermissionPrompted()) return Notification.permission;
  markPermissionPrompted();
  return Notification.requestPermission();
}

export async function syncSubscriptionWithBackend(subscription) {
  await api.post('/notifications/push/subscribe', {
    app: PUSH_APP,
    platform: 'web',
    subscription: subscription.toJSON(),
  });
  setSubscriptionStatus(true);
}

export async function ensurePushSubscriptionSynced(deps = {}) {
  const getToken = deps.getToken ?? (() => localStorage.getItem('token'));
  const getRegistration = deps.getRegistration
    ?? (() => navigator.serviceWorker.ready);
  const getSubscription = deps.getSubscription
    ?? ((registration) => registration.pushManager.getSubscription());
  const createSubscription = deps.createSubscription
    ?? ((registration, publicKey) => registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  const syncWithBackend = deps.syncWithBackend ?? syncSubscriptionWithBackend;
  const fetchPublicKey = deps.fetchPublicKey ?? fetchVapidPublicKey;
  const getPermission = deps.getPermission ?? (() => Notification.permission);
  const requestPermission = deps.requestPermission ?? requestNotificationPermission;

  if (!isPushSupported()) {
    logPushDiagnostic('unsupported', { ok: false, level: 'error' });
    return { ok: false, reason: 'unsupported' };
  }

  if (!getToken()) {
    logPushDiagnostic('not_authenticated', { ok: false, level: 'error' });
    return { ok: false, reason: 'not_authenticated' };
  }

  if (getPermission() === 'denied') {
    logPushDiagnostic('permission_denied', { ok: false, level: 'error' });
    return { ok: false, reason: 'denied' };
  }

  let registration;
  try {
    registration = await getRegistration();
  } catch (err) {
    logPushDiagnostic('service_worker_not_ready', {
      ok: false,
      level: 'error',
      message: err?.message || 'service_worker_not_ready',
    });
    return { ok: false, reason: 'service_worker_not_ready' };
  }

  let subscription = await getSubscription(registration);
  if (subscription) {
    try {
      await syncWithBackend(subscription);
      logPushDiagnostic('subscription_synced', {
        ok: true,
        mode: 'existing_browser_subscription',
        localFlagBefore: getSubscriptionStatusFlag(),
      });
      return { ok: true, synced: true, reason: 'synced_existing' };
    } catch (err) {
      setSubscriptionStatus(false);
      logPushDiagnostic('backend_sync_failed', {
        ok: false,
        level: 'error',
        message: err?.response?.data?.message || err?.message || 'sync_failed',
        status: err?.response?.status,
      });
      return { ok: false, reason: 'backend_subscribe_failed' };
    }
  }

  const permission = getPermission() === 'granted'
    ? 'granted'
    : await requestPermission();

  if (permission !== 'granted') {
    logPushDiagnostic('permission_not_granted', {
      ok: false,
      level: 'error',
      permission,
    });
    return { ok: false, reason: permission };
  }

  let publicKey;
  try {
    publicKey = await fetchPublicKey();
  } catch (err) {
    logPushDiagnostic('vapid_fetch_failed', {
      ok: false,
      level: 'error',
      message: err?.response?.data?.message || err?.message || 'vapid_fetch_failed',
      status: err?.response?.status,
    });
    return { ok: false, reason: 'vapid_unavailable' };
  }

  if (!publicKey) {
    return { ok: false, reason: 'vapid_unavailable' };
  }

  try {
    subscription = await createSubscription(registration, publicKey);
    logPushDiagnostic('browser_subscribed', { ok: true });
  } catch (err) {
    logPushDiagnostic('browser_subscribe_failed', {
      ok: false,
      level: 'error',
      message: err?.message || 'subscribe_failed',
    });
    return { ok: false, reason: 'subscribe_failed' };
  }

  try {
    await syncWithBackend(subscription);
    logPushDiagnostic('subscription_saved', { ok: true, mode: 'new_browser_subscription' });
    return { ok: true, reason: 'subscribed_and_synced' };
  } catch (err) {
    setSubscriptionStatus(false);
    logPushDiagnostic('backend_subscribe_failed', {
      ok: false,
      level: 'error',
      message: err?.response?.data?.message || err?.message || 'backend_subscribe_failed',
      status: err?.response?.status,
    });
    return { ok: false, reason: 'backend_subscribe_failed' };
  }
}

export async function subscribeToPush() {
  return ensurePushSubscriptionSynced();
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      try {
        await api.post('/notifications/push/unsubscribe', {
          subscription: { endpoint },
        });
      } catch {
        /* best-effort server cleanup */
      }
      await subscription.unsubscribe();
    }
  } catch (err) {
    logPushDiagnostic('unsubscribe_failed', {
      ok: false,
      level: 'error',
      message: err?.message || 'unsubscribe_failed',
    });
  }

  setSubscriptionStatus(false);
  return { ok: true };
}

export async function getPushDiagnostics() {
  if (!isPushSupported()) {
    return { supported: false, app: PUSH_APP };
  }

  let registration = null;
  let browserSubscription = false;
  try {
    registration = await navigator.serviceWorker.ready;
    browserSubscription = Boolean(await registration.pushManager.getSubscription());
  } catch {
    /* ignore */
  }

  return {
    supported: true,
    app: PUSH_APP,
    permission: Notification.permission,
    localStatus: getSubscriptionStatusFlag(),
    browserSubscription,
    serviceWorkerScope: registration?.scope || null,
    serviceWorkerScript: registration?.active?.scriptURL || null,
  };
}
