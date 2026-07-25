import api from '../services/api';

const SUBSCRIPTION_STATUS_KEY = 'store-owner-push-subscribed-v1';

export function isPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  );
}

function getSubscriptionStatus() {
  return localStorage.getItem(SUBSCRIPTION_STATUS_KEY) === '1';
}

function setSubscriptionStatus(active) {
  if (active) {
    localStorage.setItem(SUBSCRIPTION_STATUS_KEY, '1');
  } else {
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
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
  return data?.publicKey || null;
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }
  if (!localStorage.getItem('token')) {
    return { ok: false, reason: 'not_authenticated' };
  }
  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await navigator.serviceWorker.ready;

  if (getSubscriptionStatus()) {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return { ok: true, skipped: true, reason: 'already_subscribed' };
    }
    setSubscriptionStatus(false);
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'vapid_unavailable' };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await api.post('/notifications/push/subscribe', {
    app: 'store',
    platform: 'web',
    subscription: subscription.toJSON(),
  });

  setSubscriptionStatus(true);
  return { ok: true };
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
  } catch {
    /* ignore browser errors */
  }

  setSubscriptionStatus(false);
  return { ok: true };
}
