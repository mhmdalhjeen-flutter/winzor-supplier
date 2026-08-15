export const LOGIN_RATE_LIMIT_STORAGE_KEY = 'store_login_rate_limit_until';
export const DEFAULT_LOGIN_RATE_LIMIT_SECONDS = 30;

export function parseRetryAfterSeconds(error, fallback = DEFAULT_LOGIN_RATE_LIMIT_SECONDS) {
  const headers = error?.response?.headers;
  if (!headers) return fallback;

  const raw = headers['retry-after'] ?? headers['Retry-After'];
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

export function getRemainingSeconds(retryUntilMs) {
  if (!retryUntilMs) return 0;
  return Math.max(0, Math.ceil((retryUntilMs - Date.now()) / 1000));
}

export function formatCountdownSeconds(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function readStoredRateLimitUntil() {
  try {
    const raw = sessionStorage.getItem(LOGIN_RATE_LIMIT_STORAGE_KEY);
    const until = Number.parseInt(raw, 10);
    if (!Number.isFinite(until) || until <= Date.now()) {
      sessionStorage.removeItem(LOGIN_RATE_LIMIT_STORAGE_KEY);
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

export function storeRateLimitUntil(untilMs) {
  try {
    sessionStorage.setItem(LOGIN_RATE_LIMIT_STORAGE_KEY, String(untilMs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredRateLimitUntil() {
  try {
    sessionStorage.removeItem(LOGIN_RATE_LIMIT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createRateLimitUntilFromError(error, fallback = DEFAULT_LOGIN_RATE_LIMIT_SECONDS) {
  const seconds = parseRetryAfterSeconds(error, fallback);
  return Date.now() + seconds * 1000;
}
