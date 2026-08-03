import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../services/api';
import { getStoreOwnerCartBasePath } from '../hooks/useStoreOwnerPermissions';
import '../styles/dashboard.css';
import '../styles/Cart.css';


export default function Cart() {
  const cartBase = useMemo(() => getStoreOwnerCartBasePath(), []);
  const [cart, setCart]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [updatingId, setUpdatingId]   = useState(null);
  const [toast, setToast]             = useState('');
  const [myOrders, setMyOrders] = useState([]);

  // ─── جلب السلة ───────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get(cartBase);
      setCart(res.data.items  || []);
      setTotal(res.data.total || 0);
    } catch {
      // eslint-disable-next-line react-hooks/immutability
      showToast('تعذّر تحميل السلة');
    } finally {
      setLoading(false);
    }
  }, [cartBase]);
  const fetchMyOrders = useCallback(async () => {
  try {
    const res = await axios.get('/orders/my');
    setMyOrders(res.data.orders || []);
  } catch {
  }
}, []);

  useEffect(() => {
    fetchCart();
    fetchMyOrders();
  }, [fetchCart, fetchMyOrders]);

  // ─── مساعدات استخراج البيانات ─────────────────────────────────────────────
  // item هو الكائن المُحضَر من DB بعد populate
  // itemType هو 'Product' أو 'Offer' (بحرف كبير كما هو في DB)
  const getId    = (cartItem) => cartItem.item?._id?.toString()  || '';
  const getType  = (cartItem) => cartItem.itemType || 'Product';  // ✅ نرسل نفس القيمة المخزّنة في DB
  // العرض اسمه title، المنتج اسمه name
  const getName  = (cartItem) => cartItem.item?.name || cartItem.item?.title || '—';
  const getPrice = (cartItem) =>
    cartItem.unitPrice ??
    cartItem.item?.price ??
    cartItem.item?.finalPrice ??
    cartItem.item?.pricing?.finalPrice ??
    cartItem.item?.pricing?.unitPrice ??
    0;
  const getImage = (cartItem) => cartItem.item?.image || cartItem.item?.images?.[0] || null;

  // ─── تحديث الكمية ────────────────────────────────────────────────────────
  const updateQty = async (cartItem, newQty) => {
    if (newQty < 1) return;
    const itemId   = getId(cartItem);
    const itemType = getType(cartItem); // ✅ 'Product' أو 'Offer' — يطابق DB
    setUpdatingId(itemId);
    try {
      await axios.patch(`${cartBase}/update`, { itemId, itemType, quantity: newQty });
      // تحديث محلي بدون re-fetch لتجنب الوميض
      setCart(prev =>
        (Array.isArray(prev) ? prev : []).map(item =>
          getId(item) === itemId && getType(item) === itemType
            ? { ...item, quantity: newQty }
            : item
        )
      );
      // إعادة حساب الإجمالي
      setTotal(prev => {
        const diff = (newQty - cartItem.quantity) * getPrice(cartItem);
        return Math.max(0, prev + diff);
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر تحديث الكمية');
      await fetchCart(); // إعادة جلب حالة حقيقية من السيرفر
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── حذف عنصر ────────────────────────────────────────────────────────────
  const removeItem = async (cartItem) => {
    const itemId   = getId(cartItem);
    const itemType = getType(cartItem);
    setUpdatingId(itemId);
    try {
      await axios.delete(`${cartBase}/remove`, { data: { itemId, itemType } });
      setCart(prev => (Array.isArray(prev) ? prev : []).filter(item => !(getId(item) === itemId && getType(item) === itemType)));
      setTotal(prev => Math.max(0, prev - getPrice(cartItem) * cartItem.quantity));
      showToast('تم حذف العنصر من السلة');
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذّر الحذف');
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── تأكيد الطلب ─────────────────────────────────────────────────────────
  const handleOrder = async () => {
  try {
    const res = await axios.post(`${cartBase}/checkout`);
    setOrderPlaced(true);
    setCart([]);
    setTotal(0);
    await fetchCart();
    await fetchMyOrders();
    setTimeout(() => setOrderPlaced(false), 5000);
    showToast(res.data.message || 'تم إرسال طلبك — بانتظار تأكيد البائع');
  } catch (err) {
    showToast(err.response?.data?.message || 'تعذّر إرسال الطلب');
  }
};

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };
  const STATUS_MAP = {
  pending:   { label: 'بانتظار تأكيد البائع', color: '#f59e0b', icon: '⏳' },
  confirmed: { label: 'تم التأكيد — قيد الإرسال', color: '#3b82f6', icon: '🚚' },
  rejected:  { label: 'مرفوض من البائع',        color: '#ef4444', icon: '❌' },
  delivered: { label: 'تم التسليم',             color: '#10b981', icon: '✅' },
};


  return (
    <div className="cart-page">
      <h2 className="title">🛒 سلة المشتريات</h2>

{myOrders.length > 0 && (
  <div style={{
    background: '#f8fafc', borderRadius: '16px',
    padding: '20px', marginBottom: '24px',
    border: '1px solid #e2e8f0',
  }}>
    <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '16px' }}>
      📋 حالة طلباتك
    </h3>
    {myOrders.map(order => {
      const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
      const orderItems = Array.isArray(order.items) ? order.items : [];
      return (
        <div key={order._id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#fff', borderRadius: '10px',
          marginBottom: '8px', border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>
              {order.store?.name || 'متجر'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {orderItems.map(i => `${i.name} ×${i.quantity}`).join('، ')}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{
              background: statusMeta.color, color: '#fff',
              padding: '4px 12px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 'bold',
              display: 'block', marginBottom: '4px',
            }}>
              {statusMeta.icon} {statusMeta.label}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textAlign: 'center' }}>
              {order.total} ₪
            </span>
          </div>
        </div>
      );
    })}
  </div>
)}
      

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', padding: '12px 28px',
          borderRadius: '10px', zIndex: 9999, fontWeight: 'bold',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      {/* نجاح الطلب */}
      {orderPlaced && (
        <div className="alert-success">
          تم إرسال طلبك بنجاح! ستجده في الصفحة الرئيسية تحت حالة "قيد التنفيذ".
        </div>
      )}

      {/* سلة فارغة */}
      {cart.length === 0 && !orderPlaced ? (
        <div className="empty-cart" style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🛒</div>
          <p style={{ fontSize: '20px', color: '#64748b' }}>السلة فارغة حالياً.</p>
        </div>
      ) : (
        <div className="cart-container">
          {/* ─── قائمة العناصر ──────────────────────────────────────────── */}
          <div className="cart-items">
            {(Array.isArray(cart) ? cart : []).map((cartItem, index) => {
              const itemId    = getId(cartItem);
              const isLoading = updatingId === itemId;

              return (
                <div
                  key={`${itemId}-${index}`}
                  className="cart-item-card"
                  style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}
                >
                  {/* صورة */}
                  {getImage(cartItem) ? (
                    <img src={getImage(cartItem)} alt={getName(cartItem)} />
                  ) : (
                    <div style={{
                      width: '90px', height: '90px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      borderRadius: '10px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '32px',
                    }}>
                      {cartItem.itemType === 'Offer' ? '🎁' : '📦'}
                    </div>
                  )}

                  {/* معلومات */}
                  <div className="item-info">
                    <h3>{getName(cartItem)}</h3>
                    {cartItem.item?.description && (
                      <p style={{
                        fontSize: '13px', color: '#64748b',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {cartItem.item.description}
                      </p>
                    )}
                    <span className="unit-price">
                      السعر: {getPrice(cartItem)} ₪
                    </span>
                    {cartItem.itemType === 'Offer' && (
                      <span style={{
                        display: 'inline-block', marginTop: '4px',
                        background: '#fef3c7', color: '#92400e',
                        fontSize: '11px', padding: '2px 8px',
                        borderRadius: '20px', fontWeight: 'bold',
                      }}>
                        🎁 عرض خاص
                      </span>
                    )}
                  </div>

                  {/* التحكم */}
                  <div className="item-controls-group">
                    <div className="qty-picker">
                      <button
                        onClick={() => updateQty(cartItem, cartItem.quantity - 1)}
                        disabled={isLoading || cartItem.quantity <= 1}
                      >-</button>
                      <input type="number" value={cartItem.quantity} readOnly />
                      <button
                        onClick={() => updateQty(cartItem, cartItem.quantity + 1)}
                        disabled={isLoading}
                      >+</button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeItem(cartItem)}
                      disabled={isLoading}
                    >
                      {isLoading ? '...' : 'حذف'}
                    </button>
                  </div>

                  {/* الإجمالي */}
                  <div className="item-total">
                    {(getPrice(cartItem) * cartItem.quantity).toFixed(0)} ₪
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── ملخص الطلب ──────────────────────────────────────────────── */}
          <div className="cart-summary">
            <h3>ملخص الطلب</h3>
            <div className="summary-row">
              <span>إجمالي العناصر:</span>
              <span>{total} ₪</span>
            </div>
            <div className="summary-row">
              <span>عدد العناصر:</span>
              <span>{(Array.isArray(cart) ? cart : []).reduce((s, i) => s + (i.quantity || 0), 0)} قطعة</span>
            </div>
            <div className="summary-row">
              <span>التوصيل:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>مجاني</span>
            </div>
            <hr style={{ margin: '20px 0', borderColor: '#f1f5f9' }} />
            <div className="summary-row total">
              <span>الإجمالي الكلي:</span>
              <span>{total} ₪</span>
            </div>
            <button
              className="place-order-btn"
              onClick={handleOrder}
              disabled={cart.length === 0}
            >
              تأكيد وطلب الطلبية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}