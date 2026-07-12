import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import "../styles/dashboard.css";
import "../styles/MyStore.css";
import OfferPriceDisplay from "../components/OfferPriceDisplay";
import { queryKeys } from "../lib/queryClient";
import { unwrapList } from "../utils/unwrapList";
import LightLoadingHint from "../shared/LightLoadingHint";

export default function MyStore() {
  const user = JSON.parse(localStorage.getItem("user"));
  const isSupplier = user?.role === "supplier";
  const queryClient = useQueryClient();

  const [view, setView] = useState("products");
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

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
    enabled: view === "products",
    staleTime: 60 * 1000,
  });

  const {
    data: offers = [],
    isLoading: offersLoading,
    error: offersError,
  } = useQuery({
    queryKey: queryKeys.myOffersAll,
    queryFn: async () => {
      const { data } = await api.get("/offers/my?all=true");
      return unwrapList(data, ["offers"]);
    },
    enabled: view === "offers",
    staleTime: 60 * 1000,
  });

  const loading = view === "products" ? productsLoading : offersLoading;
  const error = view === "products"
    ? productsError?.response?.data?.message || (productsError ? "تعذّر تحميل المنتجات" : null)
    : offersError?.response?.data?.message || (offersError ? "تعذّر تحميل العروض" : null);


  const handleDeleteProduct = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await api.delete(`/products/${id}`);
      queryClient.setQueryData(queryKeys.myProducts, (prev = []) =>
        prev.filter((p) => p._id !== id)
      );
    } catch (err) {
      alert("خطأ: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العرض؟")) return;
    try {
      await api.delete(`/offers/${id}`);
      queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
        prev.filter((o) => o._id !== id)
      );
    } catch (err) {
      alert("خطأ: " + (err.response?.data?.message || err.message));
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setEditError(null);

    if (view === "products") {
      setEditForm({
        name: item.name || "",
        description: item.description || "",
        price: item.price || "",
        image: item.image || "",
        isWholesale: item.isWholesale || false,
      });
    } else {
      setEditForm({
        title: item.title || "",
        description: item.description || "",
        offerType: item.offerType || "discount",
        value: item.value || "",
        image: item.image || "",
      });
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    setEditError(null);
    try {
      const url = view === "products"
        ? `/products/${editingItem._id}`
        : `/offers/${editingItem._id}`;

      const { data } = await api.put(url, editForm);
      const updated = data.product || data.offer || { ...editingItem, ...editForm };

      if (view === "products") {
        queryClient.setQueryData(queryKeys.myProducts, (prev = []) =>
          prev.map((p) => (p._id === editingItem._id ? { ...p, ...updated } : p))
        );
      } else {
        queryClient.setQueryData(queryKeys.myOffersAll, (prev = []) =>
          prev.map((o) => (o._id === editingItem._id ? { ...o, ...updated } : o))
        );
      }

      setEditingItem(null);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message);
    } finally {
      setEditLoading(false);
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
                    <p className="price-tag">{item.price} ₪</p>
                  ) : (
                    <OfferPriceDisplay offer={item} />
                  )}

                  <p className="details-text">{item.description}</p>

                  {view === "offers" && item.expiresAt && (
                    <p className="expire-text">⏳ ينتهي: {new Date(item.expiresAt).toLocaleDateString("ar-EG")}</p>
                  )}

                  <div className="card-actions">
                    <button className="edit-btn" onClick={() => openEdit(item)}>تعديل</button>
                    <button
                      className="delete-btn"
                      onClick={() => view === "products" ? handleDeleteProduct(item._id) : handleDeleteOffer(item._id)}
                    >حذف</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {view === "products" ? "✏️ تعديل المنتج" : "✏️ تعديل العرض"}
            </h3>

            {editError && <p className="error-text">❌ {editError}</p>}

            {view === "products" ? (
              <>
                <label>اسم المنتج</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
                <label>الوصف</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <label>السعر (₪)</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
                <label>رابط الصورة</label>
                <input
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.isWholesale}
                    onChange={(e) => setEditForm({ ...editForm, isWholesale: e.target.checked })}
                  />
                  متاح للجملة
                </label>
              </>
            ) : (
              <>
                <label>عنوان العرض</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
                <label>الوصف</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <label>نوع العرض</label>
                <select
                  value={editForm.offerType}
                  onChange={(e) => setEditForm({ ...editForm, offerType: e.target.value })}
                >
                  <option value="discount">{'\u062E\u0635\u0645'} %</option>
                  <option value="fixed_price">سعر ثابت</option>
                  <option value="bogo">اشترِ واحد واحصل على آخر</option>
                  <option value="free_item">منتج مجاني</option>
                </select>
                {(editForm.offerType === "discount" || editForm.offerType === "fixed_price") && (
                  <>
                    <label>{editForm.offerType === "discount" ? `\u0646\u0633\u0628\u0629 \u0627\u0644\u062E\u0635\u0645 %` : "السعر (₪)"}</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.value}
                      onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    />
                  </>
                )}
                <label>رابط الصورة</label>
                <input
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                />
              </>
            )}

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? "⏳ جاري الحفظ..." : "💾 حفظ التعديلات"}
              </button>
              <button className="cancel-btn" onClick={() => setEditingItem(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
