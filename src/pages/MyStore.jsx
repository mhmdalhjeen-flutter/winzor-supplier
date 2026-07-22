import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import api from "../services/api";
import "../styles/dashboard.css";
import "../styles/MyStore.css";
import OfferPriceDisplay from "../components/OfferPriceDisplay";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatPriceWithUnit } from "../utils/currency";
import { queryKeys } from "../lib/queryClient";
import { unwrapList } from "../utils/unwrapList";
import LightLoadingHint from "../shared/LightLoadingHint";
import { invalidateCatalog } from "../utils/catalogRefresh";
import { getStoredUser } from "../utils/safeStorage";

export default function MyStore() {
  const user = getStoredUser({});
  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState("products");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: queryKeys.myProducts,
    queryFn: async () => {
      const { data } = await api.get("/products/my");
      return unwrapList(data, ["products"]);
    },
    staleTime: 60 * 1000,
  });

  const {
    data: offers = [],
    isLoading: offersLoading,
    error: offersError,
  } = useQuery({
    // Active offers only — delete soft-sets isActive:false; ?all=true would bring them back.
    queryKey: queryKeys.myOffers,
    queryFn: async () => {
      const { data } = await api.get("/offers/my");
      return unwrapList(data, ["offers"]).filter((o) => o.isActive !== false);
    },
    staleTime: 60 * 1000,
  });

  const loading = view === "products" ? productsLoading : offersLoading;
  const error = view === "products"
    ? productsError?.response?.data?.message || (productsError ? "تعذّر تحميل المنتجات" : null)
    : offersError?.response?.data?.message || (offersError ? "تعذّر تحميل العروض" : null);

  const refreshAll = () => {
    invalidateCatalog(queryClient);
    queryClient.invalidateQueries({ queryKey: queryKeys.myProducts });
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffersAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.myOffers });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "product") {
        await api.delete(`/products/${confirmDelete.id}`);
        queryClient.setQueryData(queryKeys.myProducts, (prev = []) =>
          prev.filter((p) => p._id !== confirmDelete.id)
        );
      } else {
        await api.delete(`/offers/${confirmDelete.id}`);
        // Soft delete sets isActive:false — keep My Store / Offer Management caches in sync.
        queryClient.setQueryData(queryKeys.myOffers, (prev = []) =>
          prev.filter((o) => o._id !== confirmDelete.id)
        );
        queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
          (prev || []).map((o) =>
            o._id === confirmDelete.id ? { ...o, isActive: false } : o
          )
        );
      }
      refreshAll();
      setConfirmDelete(null);
    } catch (err) {
      alert("خطأ: " + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
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
            items.map((item) => (
              <div key={item._id} className="card store-item-card">
                {item.image && <img src={item.image} alt={item.name || item.title} />}
                <div className="info">
                  <h3>{item.name || item.title}</h3>

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
                      className="store-action-btn store-action-btn--delete"
                      onClick={() => setConfirmDelete({
                        id: item._id,
                        type: view === "products" ? "product" : "offer",
                        name: item.name || item.title,
                      })}
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.type === "product" ? "حذف المنتج" : "حذف العرض"}
        message={confirmDelete ? `هل أنت متأكد من حذف «${confirmDelete.name}»؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />
    </div>
  );
}
