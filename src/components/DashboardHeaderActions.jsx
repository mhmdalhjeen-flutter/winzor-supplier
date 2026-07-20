import { useMemo, useState, useEffect } from "react";
import { Package, MessageCircle } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";

function BadgeCount({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="header-badge" aria-label={`${count} غير مقروء`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function DashboardHeaderActions({ badges, baseRoute, navigate }) {
  const [notifCount, setNotifCount] = useState(badges.notifications);

  useEffect(() => {
    setNotifCount(badges.notifications);
  }, [badges.notifications]);

  const items = useMemo(
    () => [
      {
        key: "orders",
        icon: Package,
        label: "الطلبات",
        path: `${baseRoute}/orders`,
        count: badges.orders,
      },
      {
        key: "chats",
        icon: MessageCircle,
        label: "الدردشة",
        path: `${baseRoute}/chats`,
        count: badges.chats,
      },
    ],
    [badges.chats, badges.orders, baseRoute]
  );

  return (
    <div className="header-actions">
      {items.map(({ key, icon: Icon, label, path, count }) => (
        <button
          key={key}
          type="button"
          className="header-icon-btn"
          title={label}
          aria-label={label}
          onClick={() => navigate(path)}
        >
          <Icon size={22} strokeWidth={2} />
          <BadgeCount count={count} />
        </button>
      ))}
      <NotificationDropdown
        count={notifCount}
        baseRoute={baseRoute}
        onCountChange={setNotifCount}
      />
    </div>
  );
}

export function SidebarBadge({ count }) {
  if (!count || count <= 0) return null;
  return <span className="sidebar-badge">{count > 99 ? "99+" : count}</span>;
}

export function BottomNavBadge({ count }) {
  if (!count || count <= 0) return null;
  return <span className="bottom-nav-badge">{count > 99 ? "99+" : count}</span>;
}
