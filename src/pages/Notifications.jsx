import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markRead, markAllRead } from "../services/notifications.service";
import { queryKeys } from "../lib/queryClient";
import LightLoadingHint from "../shared/LightLoadingHint";

const typeIcon = (type) => {
  switch (type) {
    case "offer_expiring": return "⏳";
    case "offer_expired": return "❌";
    case "offer_renewed": return "🔄";
    default: return "🔔";
  }
};

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
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800 }}>الإشعارات</h2>
        <button
          onClick={handleMarkAll}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}
        >
          تعليم الكل كمقروء
        </button>
      </div>

      {isLoading && items.length === 0 && (
        <LightLoadingHint label="جاري تحميل الإشعارات..." />
      )}

      {error && <p style={{ textAlign: "center", color: "#ef4444" }}>{error}</p>}
      {!isLoading && !error && items.length === 0 && (
        <p style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>لا توجد إشعارات</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n) => (
          <div
            key={n._id}
            onClick={() => handleClick(n)}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              background: n.read ? "#fff" : "#eff6ff",
              border: "1px solid " + (n.read ? "#e5e7eb" : "#bfdbfe"),
              borderRadius: 14, padding: 14, cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 22 }}>{typeIcon(n.type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{n.title}</strong>
                {!n.read && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3b82f6" }} />}
              </div>
              <p style={{ color: "#475569", fontSize: 14, margin: "4px 0 0" }}>{n.body}</p>
              <small style={{ color: "#94a3b8" }}>{new Date(n.createdAt).toLocaleString("ar")}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
