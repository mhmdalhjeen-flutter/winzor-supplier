import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clock, AlertCircle, RefreshCw, Tag } from "lucide-react";
import { getNotifications, markRead, markAllRead } from "../services/notifications.service";
import { queryKeys } from "../lib/queryClient";
import LightLoadingHint from "../shared/LightLoadingHint";
import "../styles/dashboard.css";

function typeMeta(type) {
  switch (type) {
    case "offer_expiring": return { Icon: Clock, tone: "warning" };
    case "offer_expired": return { Icon: AlertCircle, tone: "danger" };
    case "offer_renewed": return { Icon: RefreshCw, tone: "info" };
    case "order_rejected": return { Icon: AlertCircle, tone: "danger" };
    default: return { Icon: Tag, tone: "default" };
  }
}

export default function Notifications() {
  const qc = useQueryClient();

  const { data: items = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await getNotifications();
      return data.notifications || [];
    },
    staleTime: 30 * 1000,
  });

  const error = queryError?.response?.data?.message || (queryError ? "تعذّر تحميل الإشعارات" : "");

  const patchItems = (updater) => {
    qc.setQueryData(queryKeys.notifications, (prev = []) => updater(prev));
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      patchItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* تجاهل */
    }
  };

  const handleClick = async (n) => {
    if (n.read) return;
    try {
      await markRead(n._id);
      patchItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    } catch {
      /* تجاهل */
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-page__head">
        <div>
          <h2 className="title notifications-page__title">
            <Bell size={24} strokeWidth={2.2} />
            الإشعارات
          </h2>
          <p className="notifications-page__sub">كل التنبيهات والتحديثات في مكان واحد</p>
        </div>
        {items.some((n) => !n.read) && (
          <button type="button" className="notifications-mark-all" onClick={handleMarkAll}>
            تعليم الكل كمقروء
          </button>
        )}
      </div>

      {isLoading && items.length === 0 && (
        <LightLoadingHint label="جاري تحميل الإشعارات..." />
      )}

      {error && <p className="notifications-error">{error}</p>}
      {!isLoading && !error && items.length === 0 && (
        <div className="notifications-empty">
          <Bell size={40} strokeWidth={1.5} />
          <p>لا توجد إشعارات</p>
        </div>
      )}

      <div className="notifications-list">
        {items.map((n) => {
          const { Icon, tone } = typeMeta(n.type);
          return (
            <article
              key={n._id}
              className={`notif-full-card${n.read ? "" : " notif-full-card--unread"}`}
              onClick={() => handleClick(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleClick(n)}
            >
              <span className={`notif-card__icon notif-card__icon--${tone}`}>
                <Icon size={22} strokeWidth={2} />
              </span>
              <div className="notif-full-card__body">
                <div className="notif-full-card__row">
                  <strong>{n.title}</strong>
                  {!n.read && <span className="notif-card__dot" />}
                </div>
                {n.body && <p>{n.body}</p>}
                <time>{new Date(n.createdAt).toLocaleString("ar-EG")}</time>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
