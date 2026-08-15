/**
 * Login rate-limit countdown helpers — run with:
 * node --import ./tests/register.mjs --test tests/loginRateLimit.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOGIN_RATE_LIMIT_SECONDS,
  LOGIN_RATE_LIMIT_STORAGE_KEY,
  parseRetryAfterSeconds,
  getRemainingSeconds,
  formatCountdownSeconds,
  createRateLimitUntilFromError,
} from '../src/utils/loginRateLimit.js';

test('store storage key is isolated from customer/delivery', () => {
  assert.equal(LOGIN_RATE_LIMIT_STORAGE_KEY, 'store_login_rate_limit_until');
});

test('parseRetryAfterSeconds uses Retry-After header when present', () => {
  const error = {
    response: {
      headers: { 'retry-after': '45' },
    },
  };
  assert.equal(parseRetryAfterSeconds(error), 45);
});

test('parseRetryAfterSeconds falls back to 30 when header is missing', () => {
  assert.equal(parseRetryAfterSeconds({ response: { headers: {} } }), 30);
});

test('getRemainingSeconds uses absolute expiration timestamp', () => {
  const until = Date.now() + 2500;
  assert.equal(getRemainingSeconds(until), 3);
});

test('formatCountdownSeconds renders MM:SS', () => {
  assert.equal(formatCountdownSeconds(30), '00:30');
  assert.equal(formatCountdownSeconds(0), '00:00');
});

test('createRateLimitUntilFromError uses default seconds without header', () => {
  const before = Date.now();
  const until = createRateLimitUntilFromError({ response: { headers: {} } });
  assert.ok(until >= before + DEFAULT_LOGIN_RATE_LIMIT_SECONDS * 1000);
});
