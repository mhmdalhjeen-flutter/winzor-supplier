import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../services/api';
import '../styles/dashboard.css';

export default function ItemDetails() {
  const { id }             = useParams();
  const [searchParams]     = useSearchParams();
  const itemType           = searchParams.get('type') || 'product'; // 'product' | 'offer'
  const navigate           = useNavigate();

  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty]         = useState(1);
  const [toast, setToast]     = useState('');
  const [showContact, setShowContact] = useState(false);


  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

  // ─── جلب بيانات المنتج أو العرض ──────────────────────────────────────────
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const endpoint = itemType === 'offer' ? `/offers/${id}` : `/products/${id}`;
        const res      = await axios.get(endpoint);

        // الرد: { product: {...} } أو { offer: {...} }
        const data = res.data.product || res.data.offer || res.data;
        setItem(data);
      } catch (err) {
        // eslint-disable-next-line react-hooks/immutability
        showToast(
          err.response?.status === 404
            ? 'المنتج غير موجود أو غير متاح'
            : 'تعذّر تحميل بيانات المنتج'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, itemType]);

// دالة واتساب
const openWhatsapp = () => {
  const phone = item?.store?.whatsapp || item?.store?.phone;
  if (!phone) return alert("رقم التواصل غير متاح");
  
  const productUrl = `${window.location.origin}/store/products/${id}?type=${itemType}`;
  const msg = encodeURIComponent(
    `مرحباً، أنا مهتم بـ:\n*${getDisplayName()}*\n💰 السعر: ${originalPrice} ₪\n🔗 ${productUrl}`
  );
  window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
};
  // ─── إضافة للسلة ─────────────────────────────────────────────────────────
  const addToCart = async () => {
    try {
      await axios.post('/cart/add', {
        itemId:   id,
        itemType, // 'product' أو 'offer'
        quantity: qty,
      });
      showToast(`تم إضافة "${getDisplayName()}" إلى السلة ✅`);
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر الإضافة للسلة');
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── مساعد: اسم العنصر (منتج = name، عرض = title أو name) ───────────────
  const getDisplayName = () => item?.name || item?.title || '—';

  // ─── معرّف المستودع المرتبط ───────────────────────────────────────────────
  const storeId   = item?.store?._id || item?.store;
  const storeName = item?.store?.name || 'المستودع';
  const storeRegion = item?.store?.region || '';

  // ─── حساب السعر بعد الخصم ────────────────────────────────────────────────
  const originalPrice    = item?.price;
  const discountedPrice  = item?.discountedPrice;
  const discountPercent  = item?.discountPercentage;

  if (loading) return null;

  if (!item) return (
    <div className="item-details-page">
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔍</div>
        <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>
          لم يتم العثور على المنتج
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '20px', padding: '10px 24px',
            background: '#667eea', color: '#fff',
            border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          العودة للخلف
        </button>
      </div>
    </div>
  );

  return (
    <div className="item-details-page">
      {toast && <div className="toast-alert">{toast}</div>}

      <div className="item-container">
        {/* ─── الصورة ──────────────────────────────────────────────────── */}
        <div className="item-image-section">
          {item.image || item.images?.[0] ? (
            <img src={item.image || item.images[0]} alt={getDisplayName()} />
          ) : (
            <div style={{
              height: '350px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '80px',
            }}>
              {itemType === 'offer' ? '🎁' : '📦'}
            </div>
          )}
        </div>

        {/* ─── المعلومات ───────────────────────────────────────────────── */}
        <div className="item-info-section">
          {/* نوع العنصر */}
          <span style={{
            display: 'inline-block', marginBottom: '8px',
            background: itemType === 'offer' ? '#fef3c7' : '#ede9fe',
            color:      itemType === 'offer' ? '#92400e' : '#5b21b6',
            fontSize: '12px', padding: '3px 12px',
            borderRadius: '20px', fontWeight: 'bold',
          }}>
            {itemType === 'offer' ? '🎁 عرض خاص' : '📦 منتج'}
          </span>

          <h1 style={{ margin: '0 0 12px', fontSize: '24px', color: '#1e293b' }}>
            {getDisplayName()}
          </h1>

          {/* الشارات */}
          <div className="status-badges" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {item.isSecure !== undefined && (
              <span className={`badge ${item.isSecure ? 'secure' : 'not-secure'}`}>
                {item.isSecure ? '✅ مؤمن للتوصيل' : '❌ غير مؤمن للتوصيل'}
              </span>
            )}
            {discountPercent && (
              <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>
                خصم {discountPercent}%
              </span>
            )}
            {item.isWholesale && (
              <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>
                🏭 جملة
              </span>
            )}
          </div>

          {/* السعر */}
          {originalPrice !== undefined && (
            <div style={{ margin: '12px 0', fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
              {discountedPrice ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '17px' }}>
                    {originalPrice} ₪
                  </span>
                  <span style={{ color: '#10b981' }}>{discountedPrice} ₪</span>
                </span>
              ) : (
                <span style={{ color: '#667eea' }}>{originalPrice} ₪</span>
              )}
            </div>
          )}

          {/* الوصف */}
          {(item.description) && (
            <div className="details-box">
              <h3>التفاصيل:</h3>
              <p>{item.description}</p>
            </div>
          )}

          {/* معلومات التوصيل */}
          {item.deliveryInfo && (
            <div className="delivery-box">
              <h3>معلومات التوصيل:</h3>
              <p>{item.deliveryInfo}</p>
            </div>
          )}

          {/* مدة العرض */}
          {itemType === 'offer' && (item.startDate || item.endDate) && (
            <div className="delivery-box">
              <h3>⏳ مدة العرض:</h3>
              {item.startDate && (
                <p>يبدأ: {new Date(item.startDate).toLocaleDateString('ar-EG')}</p>
              )}
              {item.endDate && (
                <p>ينتهي: {new Date(item.endDate).toLocaleDateString('ar-EG')}</p>
              )}
            </div>
          )}

          {/* إضافة للسلة */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '20px 0' }}>
            <input
              type="number"
              value={qty}
              min="1"
              className="qty-input"
              style={{ width: '80px' }}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <button
              onClick={addToCart}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', border: 'none', padding: '12px 24px',
                borderRadius: '10px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '15px',
              }}
            >
              🛒 إضافة للسلة
            </button>
          </div>
          {/* زر التواصل — أضفه بعد زر إضافة للسلة */}
<div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
  <button
    onClick={() => setShowContact(true)}
    style={{
      background: "#25D366", color: "#fff",
      border: "none", padding: "12px 20px",
      borderRadius: "10px", cursor: "pointer",
      fontWeight: "bold", fontSize: "14px",
      display: "flex", alignItems: "center", gap: "8px",
    }}
  >
    💬 تواصل مع البائع
  </button>
</div>

{/* Modal التواصل */}
{showContact && (
  <div
    onClick={() => setShowContact(false)}
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999,
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "#fff", borderRadius: "16px",
        padding: "2rem", width: "90%", maxWidth: "380px",
        direction: "rtl",
      }}
    >
      {/* معلومات المنتج في الـ modal */}
      <div style={{
        display: "flex", gap: "12px", alignItems: "center",
        marginBottom: "1.5rem", padding: "12px",
        background: "#f8fafc", borderRadius: "10px",
      }}>
        {(item.image || item.images?.[0]) && (
          <img
            src={item.image || item.images[0]}
            alt={getDisplayName()}
            style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }}
          />
        )}
        <div>
          <p style={{ fontWeight: "bold", margin: 0, fontSize: "0.95rem" }}>{getDisplayName()}</p>
          <p style={{ color: "#667eea", margin: "4px 0 0", fontWeight: "bold" }}>{originalPrice} ₪</p>
        </div>
      </div>

      <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>اختر طريقة التواصل</h3>

      {/* واتساب */}
      <button
        onClick={openWhatsapp}
        style={{
          width: "100%", padding: "14px",
          background: "#25D366", color: "#fff",
          border: "none", borderRadius: "10px",
          cursor: "pointer", fontWeight: "bold",
          fontSize: "1rem", marginBottom: "0.75rem",
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
        }}
      >
        <span style={{ fontSize: "1.3rem" }}>📱</span>
        تواصل عبر واتساب
      </button>

      {/* رسالة داخل التطبيق */}
      <button
        onClick={() => {
            const context = {
              storeOwnerId: item?.store?.owner, // ← مهم جداً
              productId:    id,
              itemType:     itemType === "offer" ? "Offer" : "Product",
              productName:  getDisplayName(),
              productImg:   item.image || item.images?.[0] || null,
              productUrl:   window.location.href,
              productPrice: originalPrice,
            };
            localStorage.setItem("chatContext", JSON.stringify(context));
            navigate(`${baseRoute}/chats`);
            setShowContact(false);
          }}
        style={{
          width: "100%", padding: "14px",
          background: "#667eea", color: "#fff",
          border: "none", borderRadius: "10px",
          cursor: "pointer", fontWeight: "bold",
          fontSize: "1rem", marginBottom: "0.75rem",
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
        }}
      >
        <span style={{ fontSize: "1.3rem" }}>✉️</span>
        رسالة داخل التطبيق
      </button>

      <button
        onClick={() => setShowContact(false)}
        style={{
          width: "100%", padding: "10px",
          background: "#f1f5f9", color: "#64748b",
          border: "none", borderRadius: "10px",
          cursor: "pointer", fontSize: "0.9rem",
        }}
      >
        إلغاء
      </button>
    </div>
  </div>
)}

          {/* بطاقة المستودع — النقر يذهب لصفحة المستودع */}
          {storeId && (
            <div
              className="mini-warehouse-card"
              onClick={() => navigate(`${baseRoute}/warehouses/${storeId}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="wh-icon">🏢</div>
              <div className="wh-text">
                <h4>{storeName}</h4>
                {storeRegion && <p>📍 {storeRegion}</p>}
              </div>
              <div className="wh-arrow">←</div>
            </div>
          )}

          <button className="back-btn" onClick={() => navigate(-1)}>
            ← العودة للخلف
          </button>
        </div>
      </div>
    </div>
  );
}