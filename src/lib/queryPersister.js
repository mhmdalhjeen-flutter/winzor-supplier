import { get, set, del } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  CACHE_STORAGE_KEY,
  PERSIST_MAX_AGE_MS,
  shouldPersistQuery,
  trimDehydratedState,
} from './cacheConfig';

const idbStorage = {
  getItem: async (key) => get(key),
  setItem: async (key, value) => set(key, value),
  removeItem: async (key) => del(key),
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: CACHE_STORAGE_KEY,
  throttleTime: 1000,
  serialize: (persistedClient) => JSON.stringify({
    ...persistedClient,
    clientState: trimDehydratedState(persistedClient.clientState),
  }),
  deserialize: (cached) => JSON.parse(cached),
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
};
