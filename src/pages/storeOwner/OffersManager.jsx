import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { getMyOffers, deleteOffer, renewOffer, toggleOfferActive } from "../../services/offers.service";
import ConfirmDialog from "../../components/ConfirmDialog";
import "../../styles/dashboard.css";
import "../../styles/OffersManager.css";
import { formatOfferBadge } from "../../utils/offerPricing";
import OfferPriceDisplay from "../../components/OfferPriceDisplay";
import { unwrapList } from "../../utils/unwrapList";
import { queryKeys } from "../../lib/queryClient";
import { invalidateCatalog } from "../../utils/catalogRefresh";
import LightLoadingHint from "../../shared/LightLoadingHint";

const lifecycleStatus = (o) => {
  if (!o.isActive) return { label: "متوقّف", color: "#ef4444" };
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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleToggleActive = async (offer) => {
    setBusyId(offer._id);
    try {
      const { data } = await toggleOfferActive(offer._id);
      const nextActive = data.offer?.isActive ?? !offer.isActive;
      queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
        prev.map((o) => (o._id === offer._id ? { ...o, isActive: nextActive } : o))
      );
      queryClient.setQueryData(queryKeys.myOffers, (prev = []) =>
        nextActive
          ? prev.map((o) => (o._id === offer._id ? { ...o, isActive: true } : o))
          : prev.filter((o) => o._id !== offer._id)
      );
      refreshOffers();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر تغيير الحالة");
    } finally {
      setBusyId(null);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteOffer(confirmDelete.id);
      queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
        prev.filter((o) => o._id !== confirmDelete.id)
      );
      queryClient.setQueryData(queryKeys.myOffers, (prev = []) =>
        prev.filter((o) => o._id !== confirmDelete.id)
      );
      refreshOffers();
      setConfirmDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر الحذف");
    } finally {
      setDeleting(false);
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
          const isActive = o.isActive !== false;
          return (
            <div className={`offer-card${!isActive ? " offer-card--inactive" : ""}`} key={o._id}>
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

                <div className="bottom offer-card-actions">
                  <button
                    type="button"
                    className="view"
                    disabled={busyId === o._id}
                    onClick={() => handleRenew(o._id)}
                  >
                    {busyId === o._id ? "..." : "تجديد"}
                  </button>
                  <button
                    type="button"
                    className="toggle"
                    disabled={busyId === o._id}
                    onClick={() => handleToggleActive(o)}
                    title={isActive ? "إيقاف العرض" : "تفعيل العرض"}
                  >
                    {isActive ? <EyeOff size={14} strokeWidth={2.2} /> : <Eye size={14} strokeWidth={2.2} />}
                    {isActive ? "إيقاف" : "تفعيل"}
                  </button>
                  <button
                    type="button"
                    className="delete"
                    disabled={busyId === o._id}
                    onClick={() => setConfirmDelete({ id: o._id, title: o.title })}
                  >
                    <Trash2 size={14} strokeWidth={2.2} />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف نهائي"
        message="هل أنت متأكد من حذف هذا العرض نهائياً؟

لن تتمكن من استعادته لاحقاً."
        confirmLabel="حذف نهائي"
        cancelLabel="إلغاء"
        danger
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />
    </div>
  );
}
