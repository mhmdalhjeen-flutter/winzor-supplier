import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../services/api';
import '../styles/dashboard.css';

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [offers, setOffers]     = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [tab, setTab]           = useState('products');
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');
  const [quantities, setQuantities] = useState({}); // { productId: qty }

  const user      = JSON.parse(localStorage.getItem('user'));
  const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';
  const getItemName = (item) => item.name || item.title || 'عنصر';
  const getItemPrice = (item) =>
    item.price ?? item.finalPrice ?? item.pricing?.finalPrice ?? item.pricing?.unitPrice;
  const getOfferEndDate = (item) => item.expiresAt || item.endDate || item.autoDeleteAt;

  // ─── جلب بيانات المستودع ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/stores/${id}`);
        const { store, products: storeProducts, offers: storeOffers, isFollowing } = res.data;
        setWarehouse(store);
        setProducts(storeProducts || []);
        setOffers(storeOffers || []);
        setIsFollowing(isFollowing || false);
      } catch {
        // eslint-disable-next-line react-hooks/immutability
        showToast('تعذّر تحميل بيانات المستودع');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ─── انضمام / إلغاء انضمام ──────────────────────────────────────────────────
  const handleFollow = async () => {
    try {
      const res = await axios.post(`/stores/${id}/follow`);
      setIsFollowing(res.data.isFollowing);
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ');
    }
  };

  // ─── إضافة للسلة (حقيقية) ────────────────────────────────────────────────────
  const addToCart = async (item, itemType) => {
    const quantity = quantities[item._id] || 1;
    try {
      // POST /cart/add  { itemId, itemType: 'product'|'offer', quantity }
      await axios.post('/cart/add', {
        itemId:   item._id,
        itemType, // 'product' أو 'offer'
        quantity,
      });
      showToast(`تم إضافة "${getItemName(item)}" إلى السلة ✅`);
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر الإضافة للسلة');
    }
  };

  const setQty = (itemId, val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setQuantities((prev) => ({ ...prev, [itemId]: n }));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── تحديد القائمة الحالية ───────────────────────────────────────────────────
  const currentList = tab === 'products' ? products : offers;

  if (loading) return null;

  if (!warehouse) {
    return (
      <div className="warehouse-detail">
        <div style={{ textAlign: 'center', padding: '80px', color: '#ef4444' }}>
          لم يتم العثور على المستودع
        </div>
      </div>
    );
  }

  return (
    <div className="warehouse-detail">
      {toast && <div className="toast-alert">{toast}</div>}

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="warehouse-header">
        <div
          className="cover-img"
          style={{
            backgroundImage: warehouse.coverImage
              ? `url(${warehouse.coverImage})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div className="overlay"></div>
          <div className="header-info">
            <h1>{warehouse.name}</h1>
            <p>
              📍 {warehouse.region}
              {warehouse.subRegion ? ` - ${warehouse.subRegion}` : ''}
            </p>
            <span className="badge">{warehouse.category}</span>

            <div className="header-actions">
              {/* زر الانضمام — للمحلات فقط */}
              {user?.role === 'store' && (
                <button
                  className="join-wh"
                  onClick={handleFollow}
                  style={{ background: isFollowing ? '#10b981' : '' }}
                >
                  {isFollowing ? '✓ منضم كزبون' : 'انضمام كزبون'}
                </button>
              )}

              {warehouse.phone && (
                <button
                  className="social-wa"
                  onClick={() => window.open(`https://wa.me/${warehouse.phone}`)}
                >
                  واتساب
                </button>
              )}
              {warehouse.facebook && (
                <button
                  className="social-fb"
                  onClick={() => window.open(warehouse.facebook)}
                >
                  فيسبوك
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="tabs-container">
        <button
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          المنتجات ({products.length})
        </button>
        <button
          className={tab === 'offers' ? 'active' : ''}
          onClick={() => setTab('offers')}
        >
          العروض ({offers.length})
        </button>
      </div>

      {/* ─── Grid ────────────────────────────────────────────────────────────── */}
      {currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          {tab === 'products' ? 'لا توجد منتجات' : 'لا توجد عروض'}
        </div>
      ) : (
        <div className="grid">
          {currentList.map((item) => (
            <div key={item._id} className="card product-item-card">
              {item.image || item.images?.[0] ? (
                <img src={item.image || item.images[0]} alt={getItemName(item)} />
              ) : (
                <div
                  style={{
                    height: '160px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                  }}
                >
                  📦
                </div>
              )}

              <div className="info">
                <h3>{getItemName(item)}</h3>

                {/* السعر */}
                {getItemPrice(item) !== undefined && (
                  <p className="price-tag">
                    {tab === 'offers' && item.discountedPrice ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginLeft: '6px' }}>
                          {item.price}
                        </span>
                        {item.discountedPrice} ₪
                      </>
                    ) : (
                      `${getItemPrice(item)} ₪`
                    )}
                  </p>
                )}

                {/* خصم العروض */}
                {tab === 'offers' && item.discountPercentage && (
                  <span className="discount-badge">خصم {item.discountPercentage}%</span>
                )}

                {/* تواريخ العروض */}
                {tab === 'offers' && (
                  <div className="dates">
                    {item.startDate && (
                      <span>تاريخ العرض: {new Date(item.startDate).toLocaleDateString('ar-EG')}</span>
                    )}
                    {getOfferEndDate(item) && (
                      <span>تنتهي في: {new Date(getOfferEndDate(item)).toLocaleDateString('ar-EG')}</span>
                    )}
                  </div>
                )}

                {/* حالة التوصيل */}
                {item.isSecure !== undefined && (
                  <p className="secure-tag">
                    {item.isSecure ? '✅ مؤمن للتوصيل' : '❌ غير مؤمن للتوصيل'}
                  </p>
                )}

                {/* كمية + إضافة للسلة */}
                <div className="cart-controls">
                  <input
                    type="number"
                    value={quantities[item._id] || 1}
                    min="1"
                    className="qty-input"
                    onChange={(e) => setQty(item._id, e.target.value)}
                  />
                  <button
                    className="add-cart"
                    onClick={() => addToCart(item, tab === 'products' ? 'product' : 'offer')}
                  >
                    إضافة للسلة
                  </button>
                </div>

                {/* زر تصفح التفاصيل */}
                <button
                  className="view-more"
                  onClick={() =>
                    navigate(`${baseRoute}/item-details/${item._id}?type=${tab === 'products' ? 'product' : 'offer'}`)
                  }
                >
                  تصفح التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}