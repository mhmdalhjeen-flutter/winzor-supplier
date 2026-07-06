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
  // ✅ deliveryType لكل كرت على حدة
  const [deliveryTypes, setDeliveryTypes] = useState({});
  const [orders, setOrders]           = useState([]);
  const [message, setMessage]         = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(true);

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
        initDel[c._id] = 'physical'; // ✅ افتراضي: ورقي
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCardTypes();
    fetchOrders();
  }, [fetchCardTypes, fetchOrders]);

  const updateQty = (id, val) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, num) }));
  };

  const handleOrder = async (cardTypeId) => {
    if (!quantities[cardTypeId] || quantities[cardTypeId] <= 0)
      return showMsg("أدخل كمية أكبر من صفر", true);

    try {
      const res = await fetch(`${API}/code-orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cardTypeId,
          quantity:     quantities[cardTypeId],
          deliveryType: deliveryTypes[cardTypeId], // ✅
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showMsg(`✅ تم إرسال طلبك للأدمن بنجاح!`);
      setQuantities(prev => ({ ...prev, [cardTypeId]: 0 }));
      fetchOrders();
    } catch (err) {
      showMsg(err.message, true);
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

  return (
    <div className="buy-codes-page">
      <h2 className="title">🎟️ شراء أكواد المنصة</h2>

      {message && <div className="alert-success">{message}</div>}
      {error   && <div className="alert-error">{error}</div>}

      <div className="codes-grid">
        {cardTypes.length === 0 ? (
          <p className="empty-text">لا توجد أنواع كروت متاحة حالياً</p>
        ) : cardTypes.map(card => (
          <div key={card._id} className="code-card-item">
            <div className="card-preview" style={{ background: card.color }}>
              <div className="card-chip"></div>
              <div className="card-name">{card.name}</div>
              <div className="card-points">⭐ {card.points} نقطة</div>
              <div className="card-logo">OFFERS TECH</div>
              <div className="card-price">{card.price} ₪</div>
            </div>

            <div className="card-controls">

              {/* ✅ اختيار ورقي / رقمي */}
              <div className="delivery-toggle">
                <button
                  className={`delivery-btn ${deliveryTypes[card._id] === 'physical' ? 'active' : ''}`}
                  onClick={() => setDeliveryTypes(prev => ({ ...prev, [card._id]: 'physical' }))}
                >
                  🖨️ ورقي
                </button>
                <button
                  className={`delivery-btn ${deliveryTypes[card._id] === 'digital' ? 'active' : ''}`}
                  onClick={() => setDeliveryTypes(prev => ({ ...prev, [card._id]: 'digital' }))}
                >
                  📱 رقمي
                </button>
              </div>

              <div className="qty-picker">
                <button onClick={() => updateQty(card._id, (quantities[card._id] || 0) - 1)}>−</button>
                <input
                  type="number"
                  value={quantities[card._id] || 0}
                  onChange={e => updateQty(card._id, e.target.value)}
                />
                <button onClick={() => updateQty(card._id, (quantities[card._id] || 0) + 1)}>+</button>
              </div>
              <button className="order-btn" onClick={() => handleOrder(card._id)}>
                طلب الأكواد الآن
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* جدول الطلبات */}
      <div className="codes-cart-section">
        <h3 className="sub-title">🛒 طلباتي</h3>
        <div className="table-responsive">
          <table className="codes-table">
            <thead>
              <tr>
                <th>نوع الكرت</th>
                <th>النقاط</th>
                <th>الكمية</th>
                <th>النوع</th>{/* ✅ */}
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => o.status !== "received").length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>لا توجد طلبات نشطة</td></tr>
              ) : orders.filter(o => o.status !== "received").map(order => (
                <tr key={order._id}>
                  <td>{order.cardType?.name}</td>
                  <td>⭐ {order.cardType?.points}</td>
                  <td style={{ fontWeight: "bold" }}>{order.quantity}</td>
                  {/* ✅ عمود النوع */}
                  <td>
                    {order.deliveryType === 'digital'
                      ? <span style={{ color: '#2563eb', fontWeight: '600' }}>📱 رقمي</span>
                      : <span style={{ color: '#d97706', fontWeight: '600' }}>🖨️ ورقي</span>
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
                      <button className="delete-small" onClick={() => handleDelete(order._id)}>
                        حذف الطلب
                      </button>
                    )}
                    {order.status === "configured" && (
                      <span style={{ color: "green", fontSize: "0.85rem" }}>✅ جاهز</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}