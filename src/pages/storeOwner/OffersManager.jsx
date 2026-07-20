import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyOffers, deleteOffer, renewOffer } from "../../services/offers.service";
import "../../styles/dashboard.css";
import "../../styles/OffersManager.css";
import { formatOfferBadge } from "../../utils/offerPricing";
import OfferPriceDisplay from "../../components/OfferPriceDisplay";
import { unwrapList } from "../../utils/unwrapList";
import { queryKeys } from "../../lib/queryClient";
import { invalidateCatalog } from "../../utils/catalogRefresh";
import LightLoadingHint from "../../shared/LightLoadingHint";

const lifecycleStatus = (o) => {
  if (!o.isActive) return { label: "منتهٍ / متوقّف", color: "#ef4444" };
  const end = o.expiresAt || o.autoDeleteAt;
  if (end) {
    const hours = (new Date(end) - new Date()) / (1000 * 60 * 60);
    if (hours <= 0) return { label: "منتهٍ", color: "#ef4444" };
    if (hours <= 24) return { label: "ينتهي خلال 24 ساعة", color: "#f59e0b" };
    const days = hours / 24;
    if (days <= 3) return { label: `ينتهي خلال ${Math.ceil(days)} يوم`, color: "#f59e0b" };
  }
  return { label: "نشط", color: "#22c55e" };
};

export default function OffersManager() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);

  const {
    data: offers = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.myOffersAll,
    queryFn: async () => {
      const { data } = await getMyOffers(true);
      return unwrapList(data, ["offers"]);
    },
    staleTime: 60 * 1000,
  });

  const error = queryError?.response?.data?.message || (queryError ? "تعذّر تحميل العروض" : "");

  const refreshOffers = () => {
    invalidateCatalog(queryClient);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("إيقاف هذا العرض؟")) return;
    setBusyId(id);
    try {
      await deleteOffer(id);
      refreshOffers();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر الإيقاف");
    } finally {
      setBusyId(null);
    }
  };

  const handleRenew = async (id) => {
    setBusyId(id);
    try {
      await renewOffer(id);
      refreshOffers();
      alert("تم تجديد العرض بنجاح");
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر التجديد");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="offers-page">
      <h2 className="title">إدارة العروض</h2>

      {error && <p className="empty" style={{ color: "#ef4444" }}>{error}</p>}

      {isLoading && offers.length === 0 && !error && (
        <LightLoadingHint label="جاري تحميل العروض..." />
      )}

      {!isLoading && !error && offers.length === 0 && (
        <p className="empty">لا يوجد عروض حالياً</p>
      )}

      {offers.length > 0 && (
      <div className="grid">
        {offers.map((o) => {
          const status = lifecycleStatus(o);
          return (
            <div className="offer-card" key={o._id}>
              {o.image && <img src={o.image} alt={o.title} />}
              <div className="content">
                <div className="top">
                  <h3>{o.title}</h3>
                  <span className="badge">{formatOfferBadge(o)}</span>
                </div>

                <OfferPriceDisplay offer={o} />

                <p>{o.description}</p>

                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: status.color, display: "inline-block" }} />
                  <small style={{ color: status.color, fontWeight: 700 }}>{status.label}</small>
                </div>
                {o.autoDeleteAt && (
                  <small style={{ color: "#94a3b8" }}>
                    ينتهي تلقائياً: {new Date(o.autoDeleteAt).toLocaleDateString("ar")}
                  </small>
                )}

                <div className="bottom">
                  <button
                    className="view"
                    disabled={busyId === o._id}
                    onClick={() => handleRenew(o._id)}
                  >
                    {busyId === o._id ? "..." : "تجديد"}
                  </button>
                  <button
                    className="delete"
                    disabled={busyId === o._id}
                    onClick={() => handleDelete(o._id)}
                  >
                    إيقاف
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
