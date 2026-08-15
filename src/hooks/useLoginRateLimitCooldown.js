import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearStoredRateLimitUntil,
  createRateLimitUntilFromError,
  formatCountdownSeconds,
  getRemainingSeconds,
  readStoredRateLimitUntil,
  storeRateLimitUntil,
} from '../utils/loginRateLimit';

export function useLoginRateLimitCooldown() {
  const [retryUntil, setRetryUntil] = useState(() => readStoredRateLimitUntil());
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(readStoredRateLimitUntil()),
  );
  const [showRetryReady, setShowRetryReady] = useState(false);
  const intervalRef = useRef(null);
  const wasLimitedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const applyRetryUntil = useCallback((untilMs) => {
    if (!untilMs || untilMs <= Date.now()) {
      clearStoredRateLimitUntil();
      setRetryUntil(null);
      setRemainingSeconds(0);
      return;
    }
    storeRateLimitUntil(untilMs);
    setRetryUntil(untilMs);
    setRemainingSeconds(getRemainingSeconds(untilMs));
    setShowRetryReady(false);
    wasLimitedRef.current = true;
  }, []);

  useEffect(() => {
    clearTimer();

    if (!retryUntil) {
      setRemainingSeconds(0);
      if (wasLimitedRef.current) {
        setShowRetryReady(true);
        wasLimitedRef.current = false;
      }
      return undefined;
    }

    const tick = () => {
      const left = getRemainingSeconds(retryUntil);
      setRemainingSeconds(left);
      if (left <= 0) {
        clearStoredRateLimitUntil();
        setRetryUntil(null);
        clearTimer();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return clearTimer;
  }, [retryUntil, clearTimer]);

  const startFromError = useCallback((error) => {
    applyRetryUntil(createRateLimitUntilFromError(error));
  }, [applyRetryUntil]);

  const dismissRetryReady = useCallback(() => {
    setShowRetryReady(false);
  }, []);

  return {
    isRateLimited: remainingSeconds > 0,
    remainingSeconds,
    formattedRemaining: formatCountdownSeconds(remainingSeconds),
    showRetryReady,
    startFromError,
    dismissRetryReady,
  };
}
