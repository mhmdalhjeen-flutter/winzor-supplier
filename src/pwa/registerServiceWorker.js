import { registerSW } from 'virtual:pwa-register';
import { PWA_OFFLINE_READY, PWA_UPDATE_READY } from './pwaEvents';

let refreshHandler = null;

/** Called by PwaUpdateBanner to activate a waiting service worker. */
export function activatePwaUpdate() {
  if (typeof refreshHandler === 'function') {
    refreshHandler(true);
  } else {
    window.location.reload();
  }
}

export function initPwaServiceWorker() {
  if (typeof window === 'undefined') return;

  refreshHandler = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent(PWA_OFFLINE_READY));
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update().catch(() => {});
        window.setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
  });
}
