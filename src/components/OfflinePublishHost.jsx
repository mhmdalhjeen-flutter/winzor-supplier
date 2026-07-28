import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getPendingPublishCount,
} from '../lib/offlinePublishQueue';
import { processOfflinePublishQueue } from '../lib/offlinePublishSync';
import { getStoredUser } from '../utils/safeStorage';

export { processOfflinePublishQueue, uploadPublishItemById, processOnePublishItem } from '../lib/offlinePublishSync';

export default function OfflinePublishHost() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

  const refreshCount = async () => {
    setPendingCount(await getPendingPublishCount());
  };

  const runSync = () => {
    if (!navigator.onLine || !localStorage.getItem('token')) return;
    setSyncing(true);
    processOfflinePublishQueue()
      .finally(() => {
        setSyncing(false);
        refreshCount();
      });
  };

  useEffect(() => {
    refreshCount();

    const onOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const onOffline = () => setIsOnline(false);
    const onQueueChange = () => refreshCount();
    const onSyncRequest = () => runSync();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) runSync();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offline-publish-queue-changed', onQueueChange);
    window.addEventListener('offline-publish-sync-request', onSyncRequest);
    document.addEventListener('visibilitychange', onVisible);

    const unsubOnline = onlineManager.subscribe((online) => {
      setIsOnline(online);
      if (online) runSync();
    });

    if (navigator.onLine) runSync();

    const interval = window.setInterval(() => {
      if (navigator.onLine) runSync();
    }, 15_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offline-publish-queue-changed', onQueueChange);
      window.removeEventListener('offline-publish-sync-request', onSyncRequest);
      document.removeEventListener('visibilitychange', onVisible);
      unsubOnline();
      window.clearInterval(interval);
    };
  }, []);

  if (pendingCount <= 0) return null;

  const bannerText = (() => {
    if (!isOnline) {
      return pendingCount === 1
        ? 'عملية واحدة بانتظار الرفع — سيتم الرفع عند توفر الإنترنت'
        : `${pendingCount} عمليات بانتظار الرفع — سيتم الرفع عند توفر الإنترنت`;
    }
    if (syncing || isOfflinePublishSyncing()) {
      return pendingCount === 1
        ? 'جاري رفع العملية المعلقة تلقائياً...'
        : `جاري رفع ${pendingCount} عمليات معلقة تلقائياً...`;
    }
    return pendingCount === 1
      ? 'عملية واحدة بانتظار الرفع — سيتم المحاولة تلقائياً'
      : `${pendingCount} عمليات بانتظار الرفع — سيتم المحاولة تلقائياً`;
  })();

  return (
    <div
      className={`offline-publish-banner${isOnline ? ' offline-publish-banner--online' : ''}${syncing ? ' offline-publish-banner--syncing' : ''}`}
      role="status"
    >
      <span className="offline-publish-banner__dot" />
      <span className="offline-publish-banner__text">{bannerText}</span>
      <Link to={`${baseRoute}/pending-uploads`} className="offline-publish-banner__link">
        العمليات المعلقة
      </Link>
    </div>
  );
}
