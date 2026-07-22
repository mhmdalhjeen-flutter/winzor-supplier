import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Clock, AlertCircle, RefreshCw, Tag, ChevronLeft } from "lucide-react";
import { getNotifications } from "../../services/notifications.service";
import { queryKeys } from "../../lib/queryClient";
import { cleanupNotifications } from "../../utils/notificationCleanup";
import LightLoadingHint from "../../shared/LightLoadingHint";

const PREVIEW_COUNT = 5;

function typeMeta(type) {
  switch (type) {
    case "offer_expiring":
      return { Icon: Clock, tone: "warning" };
    case "offer_expired":
      return { Icon: AlertCircle, tone: "danger" };
    case "offer_renewed":
      return { Icon: RefreshCw, tone: "info" };
    default:
      return { Icon: Tag, tone: "default" };
  }
}

function formatWhen(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso);
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} س`;
  return new Date(iso).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

export default function LatestNotifications({ baseRoute }) {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await getNotifications();
      return cleanupNotifications(data.notifications || []);
    },
    staleTime: 30 * 1000,
  });

  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <section className="latest-notifications">
      <div className="latest-notifications__head">
        <div>
          <h3 className="sub-title latest-notifications__title">
            <Bell size={20} strokeWidth={2.2} />
            آخر الإشعارات
          </h3>
          <p className="latest-notifications__subtitle">تنبيهات العروض والطلبات والنشاط</p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="latest-notifications__view-all"
            onClick={() => navigate(`${baseRoute}/notifications`)}
          >
            عرض الكل
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {isLoading && preview.length === 0 && (
        <LightLoadingHint label="جاري تحميل الإشعارات..." />
      )}

      {!isLoading && preview.length === 0 && (
        <div className="latest-notifications__empty">
          <Bell size={32} strokeWidth={1.5} />
          <p>لا توجد إشعارات حالياً</p>
        </div>
      )}

      <div className="latest-notifications__list">
        {preview.map((n) => {
          const { Icon, tone } = typeMeta(n.type);
          return (
            <article
              key={n._id}
              className={`notif-card${n.read ? "" : " notif-card--unread"}`}
              onClick={() => navigate(`${baseRoute}/notifications`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(`${baseRoute}/notifications`)}
            >
              <span className={`notif-card__icon notif-card__icon--${tone}`}>
                <Icon size={20} strokeWidth={2} />
              </span>
              <div className="notif-card__content">
                <div className="notif-card__row">
                  <strong>{n.title}</strong>
                  {!n.read && <span className="notif-card__dot" />}
                </div>
                {n.body && <p>{n.body}</p>}
                <time>{formatWhen(n.createdAt)}</time>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
