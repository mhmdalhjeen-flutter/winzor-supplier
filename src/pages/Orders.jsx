// src/pages/Orders.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../services/api';
import '../styles/dashboard.css';
import '../styles/Orders.css';
import { queryKeys } from '../lib/queryClient';
import { unwrapList } from '../utils/unwrapList';
import LightLoadingHint from '../shared/LightLoadingHint';
import { getStoredUser } from '../utils/safeStorage';

const STATUS_MAP = {
    pending:   { label: 'بانتظار التأكيد', color: '#f59e0b' },
    confirmed: { label: 'تم التأكيد',      color: '#10b981' },
    rejected:  { label: 'مرفوض',           color: '#ef4444' },
    delivered: { label: 'تم التسليم',      color: '#6366f1' },
};

export default function Orders() {
    const navigate  = useNavigate();
    const user      = getStoredUser({});
    const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

    const [updating, setUpdating] = useState(null); // orderId الذي يُحدَّث
    const [toast,    setToast]    = useState('');

    const queryClient = useQueryClient();

    const { data: ordersData = [], isLoading, isError, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.storeOrders,
        queryFn: async () => {
            const res = await axios.get('/orders/store');
            return unwrapList(res.data, ['orders']);
        },
        staleTime: 30 * 1000,
    });

    const orders = ordersData;
    const loadError = queryError?.response?.data?.message || (queryError ? 'تعذّر تحميل الطلبات' : '');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // ── تغيير الحالة ───────────────────────────────────────────────────────
    const changeStatus = async (orderId, newStatus) => {
        setUpdating(orderId);
        try {
            const res = await axios.patch(`/orders/${orderId}/status`, { status: newStatus });
            queryClient.setQueryData(queryKeys.storeOrders, (prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (res.data?.deleted) {
                    return list.filter(o => o._id !== orderId);
                }
                return list.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
            });
            showToast(res.data.message || 'تم تحديث حالة الطلب');
        } catch (err) {
            showToast(err.response?.data?.message || 'تعذّر تحديث الحالة');
        } finally {
            setUpdating(null);
        }
    };

    // ── تنسيق التاريخ ──────────────────────────────────────────────────────
    const formatDate = (iso) =>
        new Date(iso).toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

    const openWhatsappWithOrder = (order) => {
    const phone = order.customer?.phone?.replace(/\D/g, '');
    if (!phone) return showToast('رقم الزبون غير متاح');

    const itemsList = (order.items || []).map(i => `• ${i.name} ×${i.quantity} — ${i.price * i.quantity} ₪`).join('\n');
    const msg = encodeURIComponent(
        `مرحباً ${order.customer?.name || ''}،\n` +
        `بخصوص طلبك رقم: ${order._id.slice(-6).toUpperCase()}\n\n` +
        `📦 الطلب:\n${itemsList}\n\n` +
        `💰 الإجمالي: ${order.total} ₪\n` +
        `📅 التاريخ: ${formatDate(order.createdAt)}\n\n` +
        `الحالة: ${STATUS_MAP[order.status]?.label || ''}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};
const openChatWithOrder = (order) => {
    const itemsList = (order.items || []).map(i => `${i.name} ×${i.quantity}`).join('، ');
    const context = {
        // ✅ نفس المفتاح الذي يقرأه Chats.jsx
        storeOwnerId: order.customer?._id,
        // context اختياري — بدونه لن يظهر شريط المنتج وهذا مقبول
        productName:  `طلب رقم ${order._id.slice(-6).toUpperCase()}`,
        productPrice: order.total,
        productId:    null,
        productImg:   null,
        productUrl:   null,
        itemType:     'Product',
        // ✅ الرسالة الجاهزة تُحقن في input بعد فتح المحادثة
        prefillText:
            `📋 بخصوص طلبك رقم: ${order._id.slice(-6).toUpperCase()}\n` +
            `📦 ${itemsList}\n` +
            `💰 الإجمالي: ${order.total} ₪\n` +
            `الحالة: ${STATUS_MAP[order.status]?.label || ''}`,
    };
    localStorage.setItem('chatContext', JSON.stringify(context));
    navigate(`${baseRoute}/chats`);
};

    return (
        <div className="orders-page">
            <h2 className="title">📋 طلبات الزبائن الواردة</h2>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b', color: '#fff',
                    padding: '12px 28px', borderRadius: '10px',
                    zIndex: 9999, fontWeight: 'bold',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast}
                </div>
            )}

            {isLoading && orders.length === 0 && (
                <LightLoadingHint label="جاري تحميل الطلبات..." />
            )}

            {isError && !isLoading && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
                    <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{loadError}</p>
                    <button type="button" onClick={() => refetch()} style={{ marginTop: '12px', color: '#2563eb', fontWeight: 'bold' }}>
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {!isLoading && !isError && orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    <div style={{ fontSize: '60px', marginBottom: '16px' }}>📭</div>
                    <p style={{ fontSize: '20px' }}>لا توجد طلبات واردة حالياً.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {(Array.isArray(orders) ? orders : []).map(order => {
                        const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
                        const isUpdating = updating === order._id;
                        const whatsapp  = order.customer?.phone?.replace(/\D/g, '');

                        return (
                            <div
                                key={order._id}
                                className="order-card"
                                style={{ opacity: isUpdating ? 0.7 : 1, transition: 'opacity 0.2s' }}
                            >
                                {/* ─ Header ─ */}
                                <div className="order-header">
                                    <h3>العميل: {order.customer?.name || '—'}</h3>
                                    <span
                                        className="order-status-badge"
                                        style={{ background: statusMeta.color, color: '#fff', padding: '4px 12px', borderRadius: '20px' }}
                                    >
                                        {statusMeta.label}
                                    </span>
                                </div>

                                {/* ─ Body ─ */}
                                <div className="order-body">
                                    <p>
                                        <strong>📦 البضاعة: </strong>
                                        {(order.items || []).map(i => `${i.name} (×${i.quantity})`).join('، ')}
                                    </p>
                                    <p>
                                        <strong>💰 الإجمالي: </strong>
                                        {order.total} ₪
                                    </p>
                                    <p>
                                        <strong>📅 التاريخ: </strong>
                                        {formatDate(order.createdAt)}
                                    </p>
                                </div>

                                {/* ─ Actions ─ */}
                                <div className="order-actions">
    <div className="reply-actions">
        {order.status === 'pending' && (
            <>
                <button
                    className="confirm-btn"
                    disabled={isUpdating}
                    onClick={() => changeStatus(order._id, 'confirmed')}
                >
                    ✅ تأكيد الطلب
                </button>
                <button
                    className="reject-btn"
                    disabled={isUpdating}
                    onClick={() => changeStatus(order._id, 'rejected')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    ❌ رفض
                </button>
            </>
        )}
        {order.status === 'confirmed' && (
            <button
                className="confirm-btn"
                disabled={isUpdating}
                onClick={() => changeStatus(order._id, 'delivered')}
            >
                🚚 تم التسليم
            </button>
        )}

        {/* ✅ واتساب مع تفاصيل الطلب */}
        {whatsapp && (
            <button
                className="wa-btn"
                onClick={() => openWhatsappWithOrder(order)}
            >
                📱 واتساب
            </button>
        )}
    </div>

    {/* ✅ دردشة مع تفاصيل الطلب */}
    <button
        className="chat-app-btn"
        onClick={() => openChatWithOrder(order)}
    >
        💬 دردشة التطبيق
    </button>
</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}