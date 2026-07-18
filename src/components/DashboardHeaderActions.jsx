import { useMemo, useState } from "react";
import { Package, Bell, MessageCircle, LayoutDashboard } from "lucide-react";

function BadgeCount({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="header-badge" aria-label={`${count} غير مقروء`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function DashboardHeaderActions({ badges, baseRoute, navigate }) {
  const [open, setOpen] = useState(false);

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
        key: "notifications",
        icon: Bell,
        label: "الإشعارات",
        path: `${baseRoute}/notifications`,
        count: badges.notifications,
      },
      {
        key: "chats",
        icon: MessageCircle,
        label: "الدردشة",
        path: `${baseRoute}/chats`,
        count: badges.chats,
      },
    ],
    [badges.chats, badges.notifications, badges.orders, baseRoute]
  );

  const totalCount = items.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className={`dashboard-header-actions${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="dashboard-header-actions__toggle header-icon-btn"
        title={open ? "إخفاء لوحة التنبيهات" : "عرض لوحة التنبيهات"}
        aria-label={open ? "إخفاء لوحة التنبيهات" : "عرض لوحة التنبيهات"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutDashboard size={22} strokeWidth={2} />
        {!open && <BadgeCount count={totalCount} />}
      </button>

      {open && (
        <div className="dashboard-header-actions__panel header-actions">
          {items.map(({ key, icon: Icon, label, path, count }) => (
            <button
              key={key}
              type="button"
              className="header-icon-btn"
              title={label}
              aria-label={label}
              onClick={() => {
                navigate(path);
                setOpen(false);
              }}
            >
              <Icon size={22} strokeWidth={2} />
              <BadgeCount count={count} />
            </button>
          ))}
        </div>
      )}
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
