import { useEffect, useState } from "react";
import api from "../services/api";

/** عدّادات الطلبات / الإشعارات / الدردشة — تُجلب عند التحميل فقط */
export default function useDashboardBadges() {
  const [badges, setBadges] = useState({ orders: 0, notifications: 0, chats: 0 });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [ordersRes, notifRes, chatsRes] = await Promise.allSettled([
        api.get("/orders/store/pending-count"),
        api.get("/notifications/unread-count"),
        api.get("/chats/unread-count"),
      ]);

      if (!mounted) return;

      setBadges({
        orders: ordersRes.status === "fulfilled" ? ordersRes.value.data?.count || 0 : 0,
        notifications: notifRes.status === "fulfilled" ? notifRes.value.data?.count || 0 : 0,
        chats: chatsRes.status === "fulfilled" ? chatsRes.value.data?.count || 0 : 0,
      });
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return badges;
}
