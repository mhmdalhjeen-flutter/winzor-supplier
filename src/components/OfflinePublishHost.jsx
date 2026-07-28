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
  const user = getStoredUser({});
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

  const refreshCount = async () => {
    setPendingCount(await getPendingPublishCount());
  };

  const runSync = () => {
    if (!navigator.onLine) return;
    processOfflinePublishQueue().finally(refreshCount);
  };

  useEffect(() => {
    refreshCount();

    const onOnline = () => runSync();
    const onQueueChange = () => refreshCount();
    const onSyncRequest = () => runSync();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) runSync();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline-publish-queue-changed', onQueueChange);
    window.addEventListener('offline-publish-sync-request', onSyncRequest);
    document.addEventListener('visibilitychange', onVisible);

    const unsubOnline = onlineManager.subscribe((online) => {
      if (online) runSync();
    });

    if (navigator.onLine) runSync();

    const interval = window.setInterval(() => {
      if (navigator.onLine) runSync();
    }, 15_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline-publish-queue-changed', onQueueChange);
      window.removeEventListener('offline-publish-sync-request', onSyncRequest);
      document.removeEventListener('visibilitychange', onVisible);
      unsubOnline();
      window.clearInterval(interval);
    };
  }, []);

  if (pendingCount <= 0) return null;

  return (
    <div className="offline-publish-banner" role="status">
      <span className="offline-publish-banner__dot" />
      <span className="offline-publish-banner__text">
        {pendingCount === 1
          ? 'عملية واحدة بانتظار الرفع — سيتم الرفع عند توفر الإنترنت'
          : `${pendingCount} عمليات بانتظار الرفع — سيتم الرفع عند توفر الإنترنت`}
      </span>
      <Link to={`${baseRoute}/pending-uploads`} className="offline-publish-banner__link">
        العمليات المعلقة
      </Link>
    </div>
  );
}
