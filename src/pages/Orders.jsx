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
    pending:               { label: 'بانتظار التأكيد',      color: '#f59e0b' },
    store_accepted:        { label: 'تم قبول المتجر',       color: '#10b981' },
    confirmed:             { label: 'تم التأكيد',           color: '#10b981' },
    preparing:             { label: 'قيد التحضير',          color: '#3b82f6' },
    delivered_to_driver:   { label: 'تم التسليم للسائق',    color: '#6366f1' },
    delivered_to_customer: { label: 'تم التسليم للزبون',    color: '#059669' },
    rejected:              { label: 'مرفوض',                color: '#ef4444' },
    delivered:             { label: 'تم التسليم',           color: '#059669' },
};

const ACTIVE_STATUSES = new Set([
    'pending',
    'store_accepted',
    'confirmed',
    'preparing',
    'delivered_to_driver',
]);

function nextStatusAction(status) {
    switch (status) {
        case 'pending':
            return { next: 'store_accepted', label: '✅ قبول الطلب' };
        case 'store_accepted':
        case 'confirmed':
            return { next: 'preparing', label: '🍳 بدء التحضير' };
        case 'preparing':
            return { next: 'delivered_to_driver', label: '🚚 تسليم للسائق' };
        case 'delivered_to_driver':
            return { next: 'delivered_to_customer', label: '📦 تم التسليم للزبون' };
        default:
            return null;
    }
}

export default function Orders() {
    const navigate  = useNavigate();
    const user      = getStoredUser({});
    const baseRoute = user?.role === 'supplier' ? '/supplier' : '/store';

    const [updating, setUpdating] = useState(null);
    const [toast,    setToast]    = useState('');
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [storeNotesTarget, setStoreNotesTarget] = useState(null);
    const [storeNotes, setStoreNotes] = useState('');

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
                if (res.data?.deleted || res.data?.archived || newStatus === 'rejected' || newStatus === 'delivered_to_customer' || newStatus === 'delivered') {
                    return list.filter(o => o._id !== orderId);
                }
                return list.map(o => o._id === orderId ? { ...o, status: res.data?.order?.status || newStatus } : o);
            });
            showToast(res.data.message || 'تم تحديث حالة الطلب');
        } catch (err) {
            showToast(err.response?.data?.message || 'تعذّر تحديث الحالة');
        } finally {
            setUpdating(null);
        }
    };

    const saveStoreNotes = async () => {
        if (!storeNotesTarget) return;
        try {
            await axios.patch(`/orders/${storeNotesTarget._id}/store-notes`, { storeNotes });
            showToast('تم حفظ ملاحظات المتجر');
            setStoreNotesTarget(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'تعذّر الحفظ');
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

        const orderNo = order.orderNumber || order._id.slice(-6).toUpperCase();
        const itemsList = (order.items || []).map(i => `• ${i.name} ×${i.quantity} — ${i.price * i.quantity} ₪`).join('\n');
        const msg = encodeURIComponent(
            `مرحباً ${order.customer?.name || ''}،\n` +
            `بخصوص طلبك رقم: ${orderNo}\n\n` +
            `📦 الطلب:\n${itemsList}\n\n` +
            `💰 الإجمالي: ${order.total} ₪\n` +
            `📅 التاريخ: ${formatDate(order.createdAt)}\n\n` +
            `الحالة: ${STATUS_MAP[order.status]?.label || ''}`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const openChatWithOrder = (order) => {
        const itemsList = (order.items || []).map(i => `${i.name} ×${i.quantity}`).join('، ');
        const orderNo = order.orderNumber || order._id.slice(-6).toUpperCase();
        const context = {
            storeOwnerId: order.customer?._id,
            productName:  `طلب رقم ${orderNo}`,
            productPrice: order.total,
            productId:    null,
            productImg:   null,
            productUrl:   null,
            itemType:     'Product',
            prefillText:
                `📋 بخصوص طلبك رقم: ${orderNo}\n` +
                `📦 ${itemsList}\n` +
                `💰 الإجمالي: ${order.total} ₪\n` +
                `الحالة: ${STATUS_MAP[order.status]?.label || ''}`,
        };
        localStorage.setItem('chatContext', JSON.stringify(context));
        navigate(`${baseRoute}/chats`);
    };

    return (
        <div className="orders-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h2 className="title" style={{ margin: 0 }}>📋 الطلبات النشطة</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="confirm-btn"
                        style={{ background: '#059669' }}
                        onClick={() => navigate(`${baseRoute}/orders/invoices`)}
                    >
                        🧾 فواتير الطلبات
                    </button>
                    <button
                        type="button"
                        className="confirm-btn"
                        style={{ background: '#6366f1' }}
                        onClick={() => navigate(`${baseRoute}/orders/history`)}
                    >
                        📜 الطلبات السابقة
                    </button>
                </div>
            </div>

            {toast && <div className="orders-toast">{toast}</div>}

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

            {storeNotesTarget && (
                <div className="reject-dialog-overlay" onClick={() => setStoreNotesTarget(null)}>
                    <div className="reject-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>ملاحظات المتجر</h3>
                        <textarea
                            rows={4}
                            value={storeNotes}
                            onChange={(e) => setStoreNotes(e.target.value)}
                            placeholder="ملاحظات داخلية أو للزبون..."
                            autoFocus
                        />
                        <div className="reject-dialog__actions">
                            <button type="button" className="reject-dialog__cancel" onClick={() => setStoreNotesTarget(null)}>
                                إلغاء
                            </button>
                            <button type="button" className="reject-dialog__confirm" onClick={saveStoreNotes}>
                                حفظ
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
                    <p style={{ fontSize: '20px' }}>لا توجد طلبات نشطة حالياً.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
                        const isUpdating = updating === order._id;
                        const whatsapp  = order.customer?.phone?.replace(/\D/g, '');
                        const action = nextStatusAction(order.status);

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
                                    <p><strong>🔢 رقم الطلب: </strong>{order.orderNumber || order._id.slice(-6).toUpperCase()}</p>
                                    {order.verificationCode && (
                                        <p style={{
                                            background: '#ecfdf5',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: 8,
                                            padding: '6px 10px',
                                            fontWeight: 'bold',
                                            letterSpacing: 2,
                                            color: '#059669',
                                            fontSize: 13,
                                        }}>
                                            🔐 رمز التحقق: {order.verificationCode}
                                        </p>
                                    )}
                                    <p>
                                        <strong>📦 البضاعة: </strong>
                                        {(order.items || []).map(i => `${i.name} (×${i.quantity})`).join('، ')}
                                    </p>
                                    {order.customerNotes && (
                                        <p><strong>📝 ملاحظات الزبون: </strong>{order.customerNotes}</p>
                                    )}
                                    <p><strong>💰 الإجمالي: </strong>{order.total} ₪</p>
                                    <p><strong>📅 التاريخ: </strong>{formatDate(order.createdAt)}</p>
                                </div>

                                <div className="order-actions">
                                    <div className="reply-actions">
                                        {action && (
                                            <button
                                                className="confirm-btn"
                                                disabled={isUpdating}
                                                onClick={() => changeStatus(order._id, action.next)}
                                            >
                                                {action.label}
                                            </button>
                                        )}
                                        {['pending', 'store_accepted', 'confirmed', 'preparing'].includes(order.status) && (
                                            <button
                                                className="reject-btn"
                                                disabled={isUpdating}
                                                onClick={() => openRejectDialog(order)}
                                            >
                                                ❌ رفض
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="wa-btn"
                                            onClick={() => {
                                                setStoreNotes(order.storeNotes || '');
                                                setStoreNotesTarget(order);
                                            }}
                                        >
                                            📝 ملاحظات
                                        </button>
                                        {whatsapp && (
                                            <button className="wa-btn" onClick={() => openWhatsappWithOrder(order)}>
                                                📱 واتساب
                                            </button>
                                        )}
                                    </div>
                                    <button className="chat-app-btn" onClick={() => openChatWithOrder(order)}>
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
