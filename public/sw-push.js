/* eslint-disable no-restricted-globals */
/**
 * Web Push handlers for the store/supplier owner PWA.
 * Loaded into the Workbox-generated service worker via importScripts.
 */

const DEFAULT_ICON = '/brand/logo-192.webp';
const DEFAULT_BADGE = '/brand/logo-64.webp';
const DEFAULT_TITLE = 'Win Gold';
const DEFAULT_URL = '/store';

function parsePushPayload(event) {
  if (!event.data) {
    return { title: DEFAULT_TITLE, body: '', icon: DEFAULT_ICON, data: {} };
  }

  try {
    const payload = event.data.json();
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    return {
      title: payload.title || DEFAULT_TITLE,
      body: payload.body || '',
      icon: payload.icon || DEFAULT_ICON,
      data,
    };
  } catch {
    const text = event.data.text ? event.data.text() : '';
    return {
      title: DEFAULT_TITLE,
      body: text || '',
      icon: DEFAULT_ICON,
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
  if (data.app !== 'store') {
    return DEFAULT_URL;
  }

  if (typeof data.url === 'string' && data.url.startsWith('/')) {
    return data.url;
  }

  const { type } = data;

  switch (type) {
    case 'order_point_gift':
    case 'order_rejected':
      return '/store/orders';
    case 'offer_expired':
    case 'offer_expiring':
    case 'offer_renewed':
      return '/store/offers';
    default:
      break;
  }

  return DEFAULT_URL;
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || DEFAULT_ICON,
      badge: DEFAULT_BADGE,
      dir: 'rtl',
      lang: 'ar',
      data: payload.data,
    }),
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
