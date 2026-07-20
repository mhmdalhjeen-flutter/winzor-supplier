import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clock, Tag, AlertCircle, RefreshCw } from "lucide-react";
import { getNotifications, markRead, markAllRead } from "../services/notifications.service";
import { queryKeys } from "../lib/queryClient";
import "../styles/NotificationDropdown.css";

const PREVIEW_LIMIT = 6;

function typeMeta(type) {
  switch (type) {
    case "offer_expiring":
      return { Icon: Clock, tone: "warning" };
    case "offer_expired":
      return { Icon: AlertCircle, tone: "danger" };
    case "offer_renewed":
      return { Icon: RefreshCw, tone: "info" };
    case "order_rejected":
      return { Icon: AlertCircle, tone: "danger" };
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

export default function NotificationDropdown({ count, baseRoute, onCountChange }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await getNotifications();
      return data.notifications || [];
    },
    enabled: open,
    staleTime: 20 * 1000,
  });

  const preview = items.slice(0, PREVIEW_LIMIT);
  const unreadPreview = preview.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const patchItems = (updater) => {
    qc.setQueryData(queryKeys.notifications, (prev = []) => updater(prev));
  };

  const handleOpen = () => setOpen((v) => !v);

  const handleItemClick = async (n) => {
    if (!n.read) {
      try {
        await markRead(n._id);
        patchItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        onCountChange?.(Math.max(0, count - 1));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      patchItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onCountChange?.(0);
    } catch {
      /* ignore */
    }
  };

  const viewAll = () => {
    setOpen(false);
    navigate(`${baseRoute}/notifications`);
  };

  return (
    <div className="notif-dropdown-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`header-icon-btn notif-bell-btn${open ? " is-open" : ""}`}
        title="الإشعارات"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={handleOpen}
      >
        <Bell size={22} strokeWidth={2} />
        {count > 0 && (
          <span className="header-badge" aria-label={`${count} غير مقروء`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="notif-dropdown-panel" role="menu">
          <div className="notif-dropdown-head">
            <div>
              <h3>الإشعارات</h3>
              {unreadPreview > 0 && (
                <span className="notif-dropdown-sub">{unreadPreview} جديد</span>
              )}
            </div>
            {items.some((n) => !n.read) && (
              <button type="button" className="notif-mark-all" onClick={handleMarkAll}>
                تعليم الكل
              </button>
            )}
          </div>

          <div className="notif-dropdown-list">
            {preview.length === 0 ? (
              <div className="notif-dropdown-empty">
                <Bell size={28} strokeWidth={1.5} />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              preview.map((n) => {
                const { Icon, tone } = typeMeta(n.type);
                return (
                  <button
                    key={n._id}
                    type="button"
                    className={`notif-dropdown-item${n.read ? "" : " is-unread"}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <span className={`notif-item-icon notif-item-icon--${tone}`}>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="notif-item-body">
                      <span className="notif-item-title">{n.title}</span>
                      {n.body && <span className="notif-item-text">{n.body}</span>}
                      <span className="notif-item-time">{formatWhen(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="notif-unread-dot" aria-hidden />}
                  </button>
                );
              })
            )}
          </div>

          {items.length > PREVIEW_LIMIT && (
            <button type="button" className="notif-view-more" onClick={viewAll}>
              عرض المزيد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
