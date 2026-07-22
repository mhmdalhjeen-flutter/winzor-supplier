/** Persisted React Query cache for store-owner offline reads. */

export const CACHE_STORAGE_KEY = 'store-owner-rq-cache-v1';

export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const PERSIST_ROOTS = new Set([
  'store',
  'products',
  'offers',
  'dashboard',
  'me',
  'orders',
  'chats',
]);

export function shouldPersistQuery(query) {
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;
  return PERSIST_ROOTS.has(key[0]);
}

export function trimDehydratedState(dehydratedState) {
  if (!dehydratedState?.queries) return dehydratedState;

  const queries = dehydratedState.queries.map((entry) => {
    const key = entry.queryKey;
    const root = key?.[0];

    if (root === 'products' && key[1] === 'my' && Array.isArray(entry.state?.data)) {
      return {
        ...entry,
        state: {
          ...entry.state,
          data: entry.state.data.slice(0, 80),
        },
      };
    }

    if (root === 'offers' && Array.isArray(entry.state?.data)) {
      return {
        ...entry,
        state: {
          ...entry.state,
          data: entry.state.data.slice(0, 80),
        },
      };
    }

    return entry;
  });

  return { ...dehydratedState, queries };
}
