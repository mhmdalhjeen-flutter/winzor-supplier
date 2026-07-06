import { useEffect, useState } from 'react';

import api from '../services/api';

const DEFAULT_PAGES = {
  cart: true,
  competitions: true,
  memberPrizes: true,
  warehouses: true,
};

let cached = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

export default function useStoreOwnerPermissions() {
  const [permissions, setPermissions] = useState(cached || DEFAULT_PAGES);
  const [isStoreOwner, setIsStoreOwner] = useState(false);

  useEffect(() => {
    let mounted = true;
    const now = Date.now();

    if (cached && now - cacheAt < CACHE_MS) {
      setPermissions(cached.pages);
      setIsStoreOwner(cached.isStoreOwner);
      return undefined;
    }

    (async () => {
      try {
        const { data } = await api.get('/settings/store-owner-pages');
        const pages = { ...DEFAULT_PAGES, ...(data?.storeOwnerPages || {}) };
        cached = { pages, isStoreOwner: true };
        cacheAt = Date.now();
        if (mounted) {
          setPermissions(pages);
          setIsStoreOwner(true);
        }
      } catch {
        cached = { pages: DEFAULT_PAGES, isStoreOwner: false };
        cacheAt = Date.now();
        if (mounted) {
          setPermissions(DEFAULT_PAGES);
          setIsStoreOwner(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { permissions, isStoreOwner };
}

export function invalidateStoreOwnerPermissionsCache() {
  cached = null;
  cacheAt = 0;
}

export function getStoreOwnerCartBasePath() {
  return '/store/cart';
}
