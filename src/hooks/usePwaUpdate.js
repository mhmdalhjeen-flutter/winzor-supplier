import { useCallback, useEffect, useState } from 'react';
import { activatePwaUpdate } from '../pwa/registerServiceWorker';
import { PWA_UPDATE_READY } from '../pwa/pwaEvents';

export default function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onUpdateReady = () => setUpdateReady(true);
    window.addEventListener(PWA_UPDATE_READY, onUpdateReady);
    return () => window.removeEventListener(PWA_UPDATE_READY, onUpdateReady);
  }, []);

  const refresh = useCallback(() => {
    activatePwaUpdate();
  }, []);

  const dismiss = useCallback(() => {
    setUpdateReady(false);
  }, []);

  return { updateReady, refresh, dismiss };
}
