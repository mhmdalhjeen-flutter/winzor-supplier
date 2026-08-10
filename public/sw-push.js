/* eslint-disable no-restricted-globals */
/**
 * Web Push handlers for the store/supplier owner PWA.
 * Loaded into the Workbox-generated service worker via importScripts.
 */

const DEFAULT_ICON = '/brand/logo-192.webp';
const DEFAULT_BADGE = '/brand/logo-64.webp';
const DEFAULT_TITLE = 'Win Gold';
const DEFAULT_URL = '/store/notifications';

function parsePushPayload(event) {
  if (!event.data) {
    return { title: DEFAULT_TITLE, body: '', icon: DEFAULT_ICON, url: DEFAULT_URL, data: {} };
  }

  try {
    const payload = event.data.json();
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    const type = payload.type || data.type || '';
    return {
      title: payload.title || DEFAULT_TITLE,
      body: payload.body || '',
      icon: payload.icon || DEFAULT_ICON,
      url: payload.url || data.url || DEFAULT_URL,
      type,
      notificationId: payload.notificationId || data.notificationId || '',
      data: { ...data, type: type || data.type || '' },
    };
  } catch {
    const text = event.data.text ? event.data.text() : '';
    return {
      title: DEFAULT_TITLE,
      body: text || '',
      icon: DEFAULT_ICON,
      url: DEFAULT_URL,
      data: {},
    };
  }
}

function resolveAppUrl(path) {
  try {
    return new URL(path || DEFAULT_URL, self.location.origin).href;
  } catch {
    return new URL(DEFAULT_URL, self.location.origin).href;
  }
}

function resolveStoreDeepLink(data = {}) {
  if (typeof data.url === 'string' && data.url.startsWith('/')) {
    return data.url;
  }

  const { type, orderId, offerId } = data;

  switch (type) {
    case 'order_modification_resolved':
    case 'order_rejected':
    case 'delivery_order_included':
    case 'delivery_store_update':
      if (orderId) return `/store/orders/${orderId}`;
      return '/store/orders';
    case 'offer_expired':
    case 'offer_expiring':
    case 'offer_renewed':
      if (offerId) return `/store/item-details/${offerId}`;
      return '/store/offers';
    case 'push_test':
      return '/store/notifications';
    default:
      if (orderId) return `/store/orders/${orderId}`;
      break;
  }

  return DEFAULT_URL;
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const deepLink = resolveStoreDeepLink({
    ...payload.data,
    url: payload.url || payload.data?.url,
  });
  const targetUrl = resolveAppUrl(deepLink);

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        dir: 'rtl',
        lang: 'ar',
        tag: payload.notificationId || payload.data?.notificationId || payload.type || 'wingold-store',
        renotify: true,
        data: {
          ...payload.data,
          type: payload.type || payload.data?.type || '',
          notificationId: payload.notificationId || payload.data?.notificationId || '',
          url: targetUrl,
        },
      });

      try {
        const clientList = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            notification: {
              id: payload.notificationId || payload.data?.notificationId || `push-${Date.now()}`,
              type: payload.type || payload.data?.type || 'info',
              title: payload.title,
              body: payload.body,
              data: payload.data || {},
            },
          });
        });
      } catch {
        /* non-fatal */
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = resolveAppUrl(
    resolveStoreDeepLink(event.notification.data || {}),
  );

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ('focus' in client) {
          await client.focus();
        }
        if ('navigate' in client) {
          try {
            await client.navigate(targetUrl);
            return;
          } catch {
            /* fall through to openWindow */
          }
        }
        return;
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});
