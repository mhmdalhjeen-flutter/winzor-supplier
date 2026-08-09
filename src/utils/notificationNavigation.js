/**
 * Navigate store/supplier user to the relevant screen for a notification.
 * @returns {boolean} true when navigation was handled
 */
export function handleStoreNotificationClick(navigate, baseRoute, notification) {
  const orderId = notification?.data?.orderId;
  if (!orderId) return false;

  if (
    notification?.type === "order_modification_resolved" ||
    notification?.type === "order_rejected"
  ) {
    navigate(`${baseRoute}/orders/${orderId}`);
    return true;
  }

  return false;
}
