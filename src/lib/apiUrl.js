/**
 * API base URL resolution.
 * - Development (vite dev): defaults to http://localhost:5000 when VITE_API_URL is unset.
 * - Production builds: set VITE_API_URL in CI/deploy (e.g. https://winzor.onrender.com).
 */
const FALLBACK_PRODUCTION_API_ROOT = 'https://winzor.onrender.com';

function resolveApiRoot(input) {
  const trimmed = String(input || '').trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
  }
  if (import.meta.env?.DEV) {
    return 'http://localhost:5000';
  }
  if (import.meta.env?.PROD && typeof console !== 'undefined') {
    console.warn(
      '[apiUrl] VITE_API_URL is not set in this production build; using fallback API root.',
      'Set VITE_API_URL in your deploy/CI environment.'
    );
  }
  return FALLBACK_PRODUCTION_API_ROOT;
}

function normalizeApiBaseUrl(input) {
  const root = resolveApiRoot(input);
  if (/\/api(?:\/v\d+)?$/i.test(root)) {
    return root;
  }
  return `${root}/api`;
}

export const API_URL = normalizeApiBaseUrl(import.meta.env?.VITE_API_URL);

export default API_URL;
