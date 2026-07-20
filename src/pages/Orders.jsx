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

const ACTIVE_STATUSES = new Set(['pending', 'confirmed']);

export default function Orders() {
    const navigate  = useNavigate();
    const user      = getStoredUser({});
    const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

    const [updating, setUpdating] = useState(null);
    const [toast,    setToast]    = useState('');
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const queryClient = useQueryClient();

    const { data: ordersData = [], isLoading, isError, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.storeOrders,
        queryFn: async () => {
            const res = await axios.get('/orders/store');
            return unwrapList(res.data, ['orders']);
        },
        staleTime: 30 * 1000,
    });

    const orders = (Array.isArray(ordersData) ? ordersData : []).filter(
        (o) => ACTIVE_STATUSES.has(o.status)
    );
    const loadError = queryError?.response?.data?.message || (queryError ? 'تعذّر تحميل الطلبات' : '');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const changeStatus = async (orderId, newStatus, extra = {}) => {
        setUpdating(orderId);
        try {
            const res = await axios.patch(`/orders/${orderId}/status`, {
                status: newStatus,
                ...extra,
            });
            queryClient.setQueryData(queryKeys.storeOrders, (prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (res.data?.deleted || newStatus === 'rejected') {
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

    const openRejectDialog = (order) => {
        setRejectTarget(order);
        setRejectReason('');
    };

    const confirmReject = async () => {
        if (!rejectTarget) return;
        const reason = rejectReason.trim();
        if (!reason) {
            showToast('يرجى كتابة سبب الرفض');
            return;
        }
        const orderId = rejectTarget._id;
        setRejectTarget(null);
        await changeStatus(orderId, 'rejected', { rejectionReason: reason });
        setRejectReason('');
    };

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
        storeOwnerId: order.customer?._id,
        productName:  `طلب رقم ${order._id.slice(-6).toUpperCase()}`,
        productPrice: order.total,
        productId:    null,
        productImg:   null,
        productUrl:   null,
        itemType:     'Product',
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

            {toast && (
                <div className="orders-toast">{toast}</div>
            )}

            {rejectTarget && (
                <div className="reject-dialog-overlay" onClick={() => setRejectTarget(null)}>
                    <div className="reject-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>سبب رفض الطلب</h3>
                        <p className="reject-dialog__hint">
                            سيصل هذا السبب للزبون كإشعار. الطلب سيُزال من قائمة الطلبات النشطة.
                        </p>
                        <textarea
                            rows={4}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="مثال: المنتج غير متوفر حالياً..."
                            autoFocus
                        />
                        <div className="reject-dialog__actions">
                            <button type="button" className="reject-dialog__cancel" onClick={() => setRejectTarget(null)}>
                                إلغاء
                            </button>
                            <button type="button" className="reject-dialog__confirm" onClick={confirmReject}>
                                تأكيد الرفض
                            </button>
                        </div>
                    </div>
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
                    {orders.map(order => {
                        const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
                        const isUpdating = updating === order._id;
                        const whatsapp  = order.customer?.phone?.replace(/\D/g, '');

                        return (
                            <div
                                key={order._id}
                                className="order-card"
                                style={{ opacity: isUpdating ? 0.7 : 1, transition: 'opacity 0.2s' }}
                            >
                                <div className="order-header">
                                    <h3>العميل: {order.customer?.name || '—'}</h3>
                                    <span
                                        className="order-status-badge"
                                        style={{ background: statusMeta.color, color: '#fff', padding: '4px 12px', borderRadius: '20px' }}
                                    >
                                        {statusMeta.label}
                                    </span>
                                </div>

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
                    onClick={() => openRejectDialog(order)}
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

        {whatsapp && (
            <button
                className="wa-btn"
                onClick={() => openWhatsappWithOrder(order)}
            >
                📱 واتساب
            </button>
        )}
    </div>

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
