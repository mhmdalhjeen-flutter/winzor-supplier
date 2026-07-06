import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "../services/api";
import "../styles/dashboard.css";
import { queryKeys } from "../lib/queryClient";
import LightLoadingHint from "../shared/LightLoadingHint";

export default function Warehouses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joiningId, setJoiningId] = useState(null);
  const [toast, setToast] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const baseRoute = user?.role === "supplier" ? "/supplier" : "/store";

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: async () => {
      const [warehousesRes, meRes] = await Promise.all([
        axios.get("/stores/warehouses"),
        axios.get("/users/me").catch(() => ({ data: {} })),
      ]);

      const warehouses = Array.isArray(warehousesRes.data)
        ? warehousesRes.data
        : warehousesRes.data.stores || [];

      const followed = (meRes.data?.followedStores || []).map((id) => String(id._id || id));
      const joinMap = {};
      warehouses.forEach((w) => {
        joinMap[w._id] = followed.includes(String(w._id));
      });

      return { warehouses, joinMap };
    },
    staleTime: 60 * 1000,
  });

  const warehouses = data?.warehouses || [];
  const joinMap = data?.joinMap || {};
  const error = queryError ? "تعذّر تحميل المستودعات" : "";

  const handleJoin = async (warehouseId) => {
    setJoiningId(warehouseId);
    try {
      const res = await axios.post(`/stores/${warehouseId}/follow`);
      const { isFollowing, message } = res.data;
      queryClient.setQueryData(queryKeys.warehouses, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          joinMap: { ...prev.joinMap, [warehouseId]: isFollowing },
        };
      });
      showToast(message || (isFollowing ? "تم الانضمام بنجاح ✅" : "تم إلغاء الانضمام"));
    } catch (err) {
      showToast(err.response?.data?.message || "حدث خطأ، حاول مجدداً");
    } finally {
      setJoiningId(null);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  if (error && warehouses.length === 0) {
    return (
      <div className="grid-page">
        <h2 className="title">🏢 المستودعات المتاحة</h2>
        <div style={{ textAlign: "center", padding: "60px", color: "#ef4444" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="grid-page">
      {toast && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", padding: "12px 24px",
          borderRadius: "10px", zIndex: 9999, fontWeight: "bold",
        }}>
          {toast}
        </div>
      )}

      <h2 className="title">🏢 المستودعات المتاحة</h2>

      {isLoading && warehouses.length === 0 && (
        <LightLoadingHint label="جاري تحميل المستودعات..." />
      )}

      {!isLoading && warehouses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
          لا توجد مستودعات متاحة حالياً
        </div>
      ) : (
        <div className="grid">
          {warehouses.map((wh) => {
            const isJoined = !!joinMap[wh._id];
            const isJoinLoading = joiningId === wh._id;

            return (
              <div key={wh._id} className="card warehouse-card">
                {wh.logo ? (
                  <img src={wh.logo} alt={wh.name} />
                ) : (
                  <div style={{
                    height: "160px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: "12px 12px 0 0",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "52px",
                  }}>
                    🏢
                  </div>
                )}

                <div className="info">
                  <h3>{wh.name}</h3>
                  <p className="type-tag">{wh.category}</p>
                  <div className="address">
                    <span className="main-addr">📍 {wh.region}</span>
                    {wh.subRegion && <span className="sub-addr">{wh.subRegion}</span>}
                  </div>
                  {wh.description && (
                    <p style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
                      {wh.description}
                    </p>
                  )}
                  {wh.customersCount > 0 && (
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                      👥 {wh.customersCount} زبون منضم
                    </p>
                  )}

                  <div className="card-actions">
                    {user?.role === "store" && (
                      <button
                        className="join-btn"
                        onClick={() => handleJoin(wh._id)}
                        disabled={isJoinLoading}
                        style={{
                          background: isJoined ? "#10b981" : "",
                          borderColor: isJoined ? "#10b981" : "",
                          color: isJoined ? "#fff" : "",
                          opacity: isJoinLoading ? 0.7 : 1,
                          cursor: isJoinLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        {isJoinLoading ? "..." : isJoined ? "✓ منضم" : "انضمام للمستودع"}
                      </button>
                    )}
                    <button
                      className="browse-btn"
                      onClick={() => navigate(`${baseRoute}/warehouses/${wh._id}`)}
                    >
                      تصفح المستودع
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
