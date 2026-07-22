import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import OfferPriceDisplay from "../components/OfferPriceDisplay";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatPriceWithUnit } from "../utils/currency";
import { queryKeys } from "../lib/queryClient";
import { unwrapList } from "../utils/unwrapList";
import LightLoadingHint from "../shared/LightLoadingHint";
import { invalidateCatalog } from "../utils/catalogRefresh";
import { getStoredUser } from "../utils/safeStorage";
import { getMyProducts, deleteProduct, toggleProductActive } from "../services/products.service";
import { getMyOffers, deleteOffer, toggleOfferActive } from "../services/offers.service";
import "../styles/dashboard.css";
import "../styles/MyStore.css";

export default function MyStore() {
  const user = getStoredUser({});
  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState("products");
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

  const loading = view === "products" ? productsLoading : offersLoading;
  const error = view === "products"
    ? productsError?.response?.data?.message || (productsError ? "تعذّر تحميل المنتجات" : null)
    : offersError?.response?.data?.message || (offersError ? "تعذّر تحميل العروض" : null);

  const refreshAll = () => {
    invalidateCatalog(queryClient);
  };

  const removeFromCaches = (id, type) => {
    if (type === "product") {
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

    if (type === "product") {
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
      if (confirmDelete.type === "product") {
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
      const { data } = type === "product"
        ? await toggleProductActive(item._id)
        : await toggleOfferActive(item._id);

      const nextActive = data.product?.isActive ?? data.offer?.isActive ?? !item.isActive;
      updateActiveInCaches(item._id, type, nextActive);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || "تعذّر تغيير الحالة");
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (item) => {
    if (view === "products") {
      navigate(`${baseRoute}/add-product-offer?editProduct=${item._id}`);
    } else {
      navigate(`${baseRoute}/add-product-offer?editOffer=${item._id}`);
    }
  };

  const items = view === "products" ? products : offers;

  return (
    <div className="my-store-page">
      <h2 className="title">🏪 {isSupplier ? "مستودع" : "متجر"}</h2>

      <div className="tabs-container">
        <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>المنتجات</button>
        <button className={view === "offers" ? "active" : ""} onClick={() => setView("offers")}>العروض</button>
      </div>

      {loading && items.length === 0 && !error && (
        <LightLoadingHint label={view === "products" ? "جاري تحميل المنتجات..." : "جاري تحميل العروض..."} />
      )}

      {error && <p className="error-text">❌ {error}</p>}

      {!loading && !error && (
        <div className="grid">
          {items.length === 0 ? (
            <p className="empty-text">{view === "products" ? "لا توجد منتجات بعد" : "لا توجد عروض بعد"}</p>
          ) : (
            items.map((item) => {
              const isActive = item.isActive !== false;
              const itemType = view === "products" ? "product" : "offer";
              return (
                <div key={item._id} className={`card store-item-card${!isActive ? " store-item-card--inactive" : ""}`}>
                  {item.image && <img src={item.image} alt={item.name || item.title} />}
                  <div className="info">
                    <div className="store-item-card__head">
                      <h3>{item.name || item.title}</h3>
                      {!isActive && <span className="store-item-badge store-item-badge--paused">متوقّف</span>}
                    </div>

                    {view === "products" ? (
                      <p className="price-tag">{formatPriceWithUnit(item.price, item.currency, item.priceUnit)}</p>
                    ) : (
                      <OfferPriceDisplay offer={item} />
                    )}

                    <p className="details-text">{item.description}</p>

                    {view === "offers" && item.expiresAt && (
                      <p className="expire-text">⏳ ينتهي: {new Date(item.expiresAt).toLocaleDateString("ar-EG")}</p>
                    )}

                    <div className="store-card-actions">
                      <button type="button" className="store-action-btn store-action-btn--edit" onClick={() => openEdit(item)}>
                        <Pencil size={16} strokeWidth={2.2} />
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="store-action-btn store-action-btn--toggle"
                        disabled={togglingId === item._id}
                        title={isActive ? "إيقاف" : "تفعيل"}
                        onClick={() => handleToggleActive(item, itemType)}
                      >
                        {isActive ? <EyeOff size={16} strokeWidth={2.2} /> : <Eye size={16} strokeWidth={2.2} />}
                        {isActive ? "إيقاف" : "تفعيل"}
                      </button>
                      <button
                        type="button"
                        className="store-action-btn store-action-btn--delete"
                        onClick={() => setConfirmDelete({
                          id: item._id,
                          type: itemType,
                          name: item.name || item.title,
                        })}
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف نهائي"
        message={confirmDelete ? (
          confirmDelete.type === "product"
            ? "هل أنت متأكد من حذف هذا المنتج نهائياً؟\n\nلن تتمكن من استعادته لاحقاً."
            : "هل أنت متأكد من حذف هذا العرض نهائياً؟\n\nلن تتمكن من استعادته لاحقاً."
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
