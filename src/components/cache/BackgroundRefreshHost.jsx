import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { scheduleBackgroundRefresh } from '../../lib/backgroundRefresh';

/**
 * Boots authenticated offline cache in the background.
 * Does not block rendering — returns null.
 *
 * Handles late login: first mount may be on /login with no token;
 * when a token appears (same mount), prefetch runs once for that session.
 */
export default function BackgroundRefreshHost() {
  const queryClient = useQueryClient();
  /** Token string we already scheduled prefetch for; null after logout. */
  const lastScheduledTokenRef = useRef(null);

  useEffect(() => {
    const trySchedule = ({ force = false } = {}) => {
      const token = localStorage.getItem('token');
      if (!token) {
        lastScheduledTokenRef.current = null;
        return;
      }
      if (!navigator.onLine) return;

      if (!force && lastScheduledTokenRef.current === token) return;

      lastScheduledTokenRef.current = token;
      scheduleBackgroundRefresh(queryClient);
    };

    // First attempt (may no-op if still on login)
    trySchedule();

    const onOnline = () => trySchedule({ force: true });
    window.addEventListener('online', onOnline);

    // Same-tab login does not remount this host — detect token appearance.
    const intervalId = window.setInterval(() => {
      trySchedule();
    }, 1500);

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(intervalId);
    };
  }, [queryClient]);

  return null;
}
