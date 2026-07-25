import { useEffect, useRef } from 'react';
import { isPushSupported, subscribeToPush } from '../../pwa/pushNotifications';

/**
 * Registers Web Push for store/supplier owners after authentication.
 * Does not block rendering — returns null.
 */
export default function PushSubscriptionHost() {
  /** Token string we already attempted subscription for; null after logout. */
  const lastAttemptedTokenRef = useRef(null);

  useEffect(() => {
    const trySubscribe = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        lastAttemptedTokenRef.current = null;
        return;
      }
      if (!isPushSupported()) return;
      if (Notification.permission === 'denied') return;
      if (lastAttemptedTokenRef.current === token) return;

      lastAttemptedTokenRef.current = token;

      const run = () => {
        subscribeToPush().catch(() => {});
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 4000 });
      } else {
        window.setTimeout(run, 1200);
      }
    };

    trySubscribe();

    const intervalId = window.setInterval(() => {
      trySubscribe();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
