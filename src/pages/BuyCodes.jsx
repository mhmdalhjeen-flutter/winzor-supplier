// BuyCodes.jsx
import { useState, useEffect, useCallback } from 'react';
import '../styles/dashboard.css';
import '../styles/BuyCodes.css';

import { API_URL } from "../lib/apiUrl";

const API = API_URL;

export default function BuyCodes() {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const [cardTypes, setCardTypes]     = useState([]);
  const [quantities, setQuantities]   = useState({});
  const [deliveryTypes, setDeliveryTypes] = useState({});
  const [orders, setOrders]           = useState([]);
  const [message, setMessage]         = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(true);
  const [orderingId, setOrderingId]   = useState(null);

  const showMsg = (msg, isError = false) => {
    isError ? setError(msg) : setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 4000);
  };

  const fetchCardTypes = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/card-types`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCardTypes(data.cards);
      const initQty  = {};
      const initDel  = {};
      data.cards.forEach(c => {
        initQty[c._id] = 0;
        initDel[c._id] = 'physical';
      });
      setQuantities(initQty);
      setDeliveryTypes(initDel);
    } catch (err) {
      showMsg(err.message, true);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/code-orders/my`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders(data.orders);
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardTypes();
    fetchOrders();
  }, [fetchCardTypes, fetchOrders]);

  const updateQty = (id, val) => {
    const num = parseInt(val, 10) || 0;
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, num) }));
  };

  const handleOrder = async (cardTypeId) => {
    if (!quantities[cardTypeId] || quantities[cardTypeId] <= 0)
      return showMsg("أدخل كمية أكبر من صفر", true);

    setOrderingId(cardTypeId);
    try {
      const res = await fetch(`${API}/code-orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cardTypeId,
          quantity:     quantities[cardTypeId],
          deliveryType: deliveryTypes[cardTypeId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showMsg(`تم إرسال طلبك للأدمن بنجاح`);
      setQuantities(prev => ({ ...prev, [cardTypeId]: 0 }));
      fetchOrders();
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      setOrderingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذا الطلب؟")) return;
    try {
      const res  = await fetch(`${API}/code-orders/my/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders(prev => prev.filter(o => o._id !== id));
      showMsg("تم حذف الطلب");
    } catch (err) {
      showMsg(err.message, true);
    }
  };

  const statusMap = {
    pending:    { label: "قيد المراجعة", cls: "pending"  },
    configured: { label: "تم التكوين",   cls: "done"     },
    received:   { label: "تم الاستلام",  cls: "received" },
    rejected:   { label: "مرفوض",        cls: "rejected" },
  };

  const activeOrders = orders.filter(o => o.status !== "received");

  return (
    <div className="buy-codes-page">
      <div className="buy-codes-page__head">
        <h2 className="title">شراء أكواد المنصة</h2>
        <p className="buy-codes-page__sub">اختر نوع الكرت والكمية ثم أرسل الطلب</p>
      </div>

      {message && <div className="alert-success">{message}</div>}
      {error   && <div className="alert-error">{error}</div>}

      <div className="codes-grid">
        {cardTypes.length === 0 ? (
          <p className="empty-text">لا توجد أنواع كروت متاحة حالياً</p>
        ) : cardTypes.map(card => (
          <article key={card._id} className="code-card-item">
            <div className="card-preview" style={{ background: card.color }}>
              <div className="card-chip" />
              <div className="card-name">{card.name}</div>
              <div className="card-points">⭐ {card.points} نقطة</div>
              <div className="card-logo">OFFERS TECH</div>
              <div className="card-price">{card.price} ₪</div>
            </div>

            <div className="card-controls">
              <div className="delivery-toggle">
                <button
                  type="button"
                  className={`delivery-btn ${deliveryTypes[card._id] === 'physical' ? 'active' : ''}`}
                  onClick={() => setDeliveryTypes(prev => ({ ...prev, [card._id]: 'physical' }))}
                >
                  🖨️ ورقي
                </button>
                <button
                  type="button"
                  className={`delivery-btn ${deliveryTypes[card._id] === 'digital' ? 'active' : ''}`}
                  onClick={() => setDeliveryTypes(prev => ({ ...prev, [card._id]: 'digital' }))}
                >
                  📱 رقمي
                </button>
              </div>

              <div className="code-order-row">
                <div className="qty-picker">
                  <button type="button" aria-label="تقليل" onClick={() => updateQty(card._id, (quantities[card._id] || 0) - 1)}>−</button>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={quantities[card._id] || 0}
                    onChange={e => updateQty(card._id, e.target.value)}
                  />
                  <button type="button" aria-label="زيادة" onClick={() => updateQty(card._id, (quantities[card._id] || 0) + 1)}>+</button>
                </div>
                <button
                  type="button"
                  className="order-btn"
                  disabled={orderingId === card._id}
                  onClick={() => handleOrder(card._id)}
                >
                  {orderingId === card._id ? 'جارٍ الإرسال...' : 'طلب الأكواد'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="codes-cart-section">
        <h3 className="sub-title">طلباتي</h3>

        {loading ? (
          <p className="empty-text">جاري تحميل الطلبات...</p>
        ) : activeOrders.length === 0 ? (
          <p className="empty-text">لا توجد طلبات نشطة</p>
        ) : (
          <>
            <div className="codes-orders-cards">
              {activeOrders.map(order => (
                <div key={order._id} className="code-order-card">
                  <div className="code-order-card__top">
                    <strong>{order.cardType?.name}</strong>
                    <span className={`status-tag ${statusMap[order.status]?.cls}`}>
                      {statusMap[order.status]?.label}
                    </span>
                  </div>
                  <div className="code-order-card__meta">
                    <span>⭐ {order.cardType?.points} نقطة</span>
                    <span>الكمية: {order.quantity}</span>
                    <span>
                      {order.deliveryType === 'digital' ? '📱 رقمي' : '🖨️ ورقي'}
                    </span>
                  </div>
                  <div className="code-order-card__foot">
                    <time>{new Date(order.createdAt).toLocaleDateString("ar-EG")}</time>
                    {order.status === "pending" && (
                      <button type="button" className="delete-small" onClick={() => handleDelete(order._id)}>
                        حذف
                      </button>
                    )}
                    {order.status === "configured" && (
                      <span className="code-order-ready">✅ جاهز</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="table-responsive codes-table-wrap">
              <table className="codes-table">
                <thead>
                  <tr>
                    <th>نوع الكرت</th>
                    <th>النقاط</th>
                    <th>الكمية</th>
                    <th>النوع</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map(order => (
                    <tr key={order._id}>
                      <td>{order.cardType?.name}</td>
                      <td>⭐ {order.cardType?.points}</td>
                      <td>{order.quantity}</td>
                      <td>
                        {order.deliveryType === 'digital'
                          ? <span className="delivery-tag delivery-tag--digital">📱 رقمي</span>
                          : <span className="delivery-tag delivery-tag--physical">🖨️ ورقي</span>
                        }
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td>
                        <span className={`status-tag ${statusMap[order.status]?.cls}`}>
                          {statusMap[order.status]?.label}
                        </span>
                      </td>
                      <td>
                        {order.status === "pending" && (
                          <button type="button" className="delete-small" onClick={() => handleDelete(order._id)}>
                            حذف
                          </button>
                        )}
                        {order.status === "configured" && (
                          <span className="code-order-ready">✅ جاهز</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
