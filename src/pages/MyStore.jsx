import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import OfferPriceDisplay from "../components/OfferPriceDisplay";
import AvailabilitySwitch from "../components/AvailabilitySwitch";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatPriceWithUnit } from "../utils/currency";
import { formatOfferBadge } from "../utils/offerPricing";
import { queryKeys } from "../lib/queryClient";
import { unwrapList } from "../utils/unwrapList";
import LightLoadingHint from "../shared/LightLoadingHint";
import { invalidateCatalog } from "../utils/catalogRefresh";
import { getStoredUser } from "../utils/safeStorage";
import { getMyProducts, deleteProduct, toggleProductActive } from "../services/products.service";
import { getMyOffers, deleteOffer, toggleOfferActive, renewOffer } from "../services/offers.service";
import "../styles/MyStore.css";

const offerLifecycleLabel = (o) => {
  if (!o.isActive) return { label: "غير متوفر", tone: "muted" };
  const end = o.expiresAt || o.autoDeleteAt;
  if (end) {
    const hours = (new Date(end) - new Date()) / (1000 * 60 * 60);
    if (hours <= 0) return { label: "منتهٍ", tone: "danger" };
    if (hours <= 24) return { label: "ينتهي قريباً", tone: "warn" };
  }
  return { label: "نشط", tone: "ok" };
};

export default function MyStore() {
  const user = getStoredUser({});
  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState("items");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: queryKeys.myProducts,
    queryFn: async () => {
      const { data } = await getMyProducts(true);
      return unwrapList(data, ["products"]);
    },
    staleTime: 60 * 1000,
  });

  const {
    data: offers = [],
    isLoading: offersLoading,
    error: offersError,
  } = useQuery({
    queryKey: queryKeys.myOffersAll,
    queryFn: async () => {
      const { data } = await getMyOffers(true);
      return unwrapList(data, ["offers"]);
    },
    staleTime: 60 * 1000,
  });

  const loading = view === "items" ? productsLoading : offersLoading;
  const error = view === "items"
    ? productsError?.response?.data?.message || (productsError ? "تعذّر تحميل العناصر" : null)
    : offersError?.response?.data?.message || (offersError ? "تعذّر تحميل العروض" : null);

  const refreshAll = () => invalidateCatalog(queryClient);

  const removeFromCaches = (id, type) => {
    if (type === "item") {
      queryClient.setQueryData(queryKeys.myProducts, (prev = []) =>
        prev.filter((p) => p._id !== id)
      );
    } else {
      queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
        prev.filter((o) => o._id !== id)
      );
      queryClient.setQueryData(queryKeys.myOffers, (prev = []) =>
        prev.filter((o) => o._id !== id)
      );
    }
  };

  const updateActiveInCaches = (id, type, isActive) => {
    const patch = (prev = []) =>
      prev.map((item) => (item._id === id ? { ...item, isActive } : item));

    if (type === "item") {
      queryClient.setQueryData(queryKeys.myProducts, patch);
    } else {
      queryClient.setQueryData(queryKeys.myOffersAll, patch);
      queryClient.setQueryData(queryKeys.myOffers, (prev = []) =>
        isActive ? patch(prev) : prev.filter((o) => o._id !== id)
      );
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "item") {
        await deleteProduct(confirmDelete.id);
      } else {
        await deleteOffer(confirmDelete.id);
      }
      removeFromCaches(confirmDelete.id, confirmDelete.type);
      refreshAll();
      setConfirmDelete(null);
    } catch (err) {
      alert("خطأ: " + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (item, type) => {
    setTogglingId(item._id);
    try {
      const { data } = type === "item"
        ? await toggleProductActive(item._id)
        : await toggleOfferActive(item._id);

      const nextActive = data.product?.isActive ?? data.offer?.isActive ?? !item.isActive;
      updateActiveInCaches(item._id, type, nextActive);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر تغيير التوفر");
    } finally {
      setTogglingId(null);
    }
  };

  const handleRenew = async (id) => {
    setTogglingId(id);
    try {
      await renewOffer(id);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر التجديد");
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (item) => {
    if (view === "items") {
      navigate(`${baseRoute}/add-product-offer?editProduct=${item._id}`);
    } else {
      navigate(`${baseRoute}/add-product-offer?editOffer=${item._id}`);
    }
  };

  const items = view === "items" ? products : offers;

  return (
    <div className="my-store-page">
      <header className="my-store-page__head">
        <div>
          <h2 className="my-store-page__title">{isSupplier ? "مستودعي" : "متجري"}</h2>
          <p className="my-store-page__subtitle">إدارة العناصر والعروض من مكان واحد</p>
        </div>
        <button
          type="button"
          className="my-store-page__add-btn"
          onClick={() => navigate(`${baseRoute}/add-product-offer`)}
        >
          <Plus size={18} />
          إضافة
        </button>
      </header>

      <div className="my-store-tabs">
        <button
          type="button"
          className={view === "items" ? "active" : ""}
          onClick={() => setView("items")}
        >
          العناصر
          {products.length > 0 && <span className="my-store-tabs__count">{products.length}</span>}
        </button>
        <button
          type="button"
          className={view === "offers" ? "active" : ""}
          onClick={() => setView("offers")}
        >
          العروض
          {offers.length > 0 && <span className="my-store-tabs__count">{offers.length}</span>}
        </button>
      </div>

      {loading && items.length === 0 && !error && (
        <LightLoadingHint label={view === "items" ? "جاري تحميل العناصر..." : "جاري تحميل العروض..."} />
      )}

      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div className="my-store-grid">
          {items.length === 0 ? (
            <p className="my-store-empty">
              {view === "items" ? "لا توجد عناصر بعد" : "لا توجد عروض بعد"}
            </p>
          ) : (
            items.map((item) => {
              const isActive = item.isActive !== false;
              const itemType = view === "items" ? "item" : "offer";
              const lifecycle = view === "offers" ? offerLifecycleLabel(item) : null;
              const categoryName = item.storeItemCategory?.name;

              return (
                <article
                  key={item._id}
                  className={`my-store-card${!isActive ? " my-store-card--unavailable" : ""}`}
                >
                  <div className="my-store-card__media" onClick={() => openEdit(item)} role="presentation">
                    {item.image ? (
                      <img src={item.image} alt={item.name || item.title} />
                    ) : (
                      <div className="my-store-card__placeholder">📦</div>
                    )}
                    {!isActive && <span className="my-store-card__unavailable-badge">غير متوفر</span>}
                  </div>

                  <div className="my-store-card__body">
                    <div className="my-store-card__top">
                      <h3>{item.name || item.title}</h3>
                      {view === "offers" && (
                        <span className="my-store-card__offer-badge">{formatOfferBadge(item)}</span>
                      )}
                    </div>

                    {categoryName && (
                      <span className="my-store-card__category">{categoryName}</span>
                    )}

                    {view === "items" ? (
                      <p className="my-store-card__price">
                        {formatPriceWithUnit(item.price, item.currency, item.priceUnit)}
                      </p>
                    ) : (
                      <OfferPriceDisplay offer={item} />
                    )}

                    {lifecycle && (
                      <span className={`my-store-card__lifecycle my-store-card__lifecycle--${lifecycle.tone}`}>
                        {lifecycle.label}
                      </span>
                    )}

                    {view === "offers" && item.expiresAt && (
                      <p className="my-store-card__expire">
                        ينتهي: {new Date(item.expiresAt).toLocaleDateString("ar-EG")}
                      </p>
                    )}

                    <div className="my-store-card__availability">
                      <AvailabilitySwitch
                        id={`avail-${item._id}`}
                        checked={isActive}
                        disabled={togglingId === item._id}
                        onChange={() => handleToggleActive(item, itemType)}
                      />
                    </div>

                    <div className="my-store-card__actions">
                      <button type="button" className="my-store-card__btn" onClick={() => openEdit(item)}>
                        <Pencil size={15} />
                        تعديل
                      </button>
                      {view === "offers" && (
                        <button
                          type="button"
                          className="my-store-card__btn my-store-card__btn--renew"
                          disabled={togglingId === item._id}
                          onClick={() => handleRenew(item._id)}
                        >
                          تجديد
                        </button>
                      )}
                      <button
                        type="button"
                        className="my-store-card__btn my-store-card__btn--delete"
                        onClick={() => setConfirmDelete({
                          id: item._id,
                          type: itemType,
                          name: item.name || item.title,
                        })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف نهائي"
        message={confirmDelete ? (
          confirmDelete.type === "item"
            ? `هل أنت متأكد من حذف "${confirmDelete.name}" نهائياً؟`
            : `هل أنت متأكد من حذف العرض "${confirmDelete.name}" نهائياً؟`
        ) : ""}
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
