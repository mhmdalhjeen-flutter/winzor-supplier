/** Client-side notification retention — unread notifications are always kept. */
export const NOTIFICATION_RETENTION = {
  maxTotal: 200,
  maxAgeDays: 90,
};

export function cleanupNotifications(notifications = []) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const now = Date.now();
  const maxAgeMs = NOTIFICATION_RETENTION.maxAgeDays * 24 * 60 * 60 * 1000;

  const unread = notifications.filter((n) => !n.read);
  const read = notifications
    .filter((n) => n.read)
    .filter((n) => {
      const created = new Date(n.createdAt).getTime();
      return Number.isFinite(created) && now - created <= maxAgeMs;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadSorted = [...unread].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const slotsForRead = Math.max(0, NOTIFICATION_RETENTION.maxTotal - unreadSorted.length);
  const trimmedRead = read.slice(0, slotsForRead);

  return [...unreadSorted, ...trimmedRead].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}
