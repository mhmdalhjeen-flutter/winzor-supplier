/** قراءة unreadCount من Mongoose Map أو plain object */
export function getUnreadCountForUser(unreadCount, userId) {
  if (!unreadCount || userId == null || userId === "") return 0;
  const key = String(userId);
  if (typeof unreadCount.get === "function") {
    return Number(unreadCount.get(key)) || 0;
  }
  if (typeof unreadCount === "object") {
    return Number(unreadCount[key]) || 0;
  }
  return 0;
}
