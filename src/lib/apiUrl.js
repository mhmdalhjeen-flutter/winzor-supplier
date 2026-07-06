/** API base — set VITE_API_URL in .env (backend root, e.g. https://winzor.onrender.com) */
const PRODUCTION_API_ROOT = 'https://winzor.onrender.com';

function normalizeApiBaseUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    const root = import.meta.env.DEV ? 'http://localhost:5000' : PRODUCTION_API_ROOT;
    return `${root.replace(/\/+$/, '')}/api`;
  }
  const withoutTrailing = trimmed.replace(/\/+$/, '');
  if (/\/api(?:\/v\d+)?$/i.test(withoutTrailing)) {
    return withoutTrailing;
  }
  return `${withoutTrailing}/api`;
}

export const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export default API_URL;
