import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../services/api';
import '../styles/dashboard.css';
import '../styles/Orders.css';
import { unwrapList } from '../utils/unwrapList';
import LightLoadingHint from '../shared/LightLoadingHint';

const STATUS_OPTIONS = [
    { value: '', label: 'كل الحالات' },
    { value: 'delivered_to_customer', label: 'تم التسليم للزبون' },
    { value: 'delivered', label: 'تم التسليم' },
    { value: 'rejected', label: 'مرفوض' },
    { value: 'cancelled', label: 'ملغى' },
    { value: 'completed_off_platform', label: 'اكتمل خارج المنصة' },
];

const STATUS_MAP = Object.fromEntries(
    STATUS_OPTIONS.filter(o => o.value).map(o => [o.value, o.label])
);

export default function OrderHistory() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [detail, setDetail] = useState(null);

    const params = useMemo(() => {
        const p = new URLSearchParams();
        if (search.trim()) p.set('q', search.trim());
        if (status) p.set('status', status);
        if (dateFrom) p.set('from', dateFrom);
        if (dateTo) p.set('to', dateTo);
        return p.toString();
    }, [search, status, dateFrom, dateTo]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['storeOrderHistory', params],
        queryFn: async () => {
            const res = await axios.get(`/orders/store/history?${params}`);
            return res.data;
        },
        staleTime: 30 * 1000,
    });

    const orders = unwrapList(data, ['orders']);

    const formatDate = (iso) =>
        iso ? new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    return (
        <div className="orders-page">
            <h2 className="title">📜 الطلبات السابقة</h2>

            <div className="orders-filters" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
                <input
                    type="search"
                    placeholder="بحث برقم الطلب أو اسم الزبون..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
                <button type="button" className="confirm-btn" onClick={() => refetch()}>🔍 بحث</button>
            </div>

            {isLoading && <LightLoadingHint label="جاري تحميل السجل..." />}
            {isError && <p style={{ color: '#ef4444' }}>تعذّر تحميل الطلبات السابقة</p>}

            {!isLoading && orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>لا توجد طلبات في السجل</div>
            )}

            <div className="orders-list">
                {orders.map(order => (
                    <div key={order._id} className="order-card">
                        <div className="order-header">
                            <h3>{order.customer?.name || 'زبون'}</h3>
                            <span style={{ background: '#6366f1', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                                {STATUS_MAP[order.status] || order.status}
                            </span>
                        </div>
                        <div className="order-body">
                        <p><strong>🔢 </strong>{order.orderNumber || order._id.slice(-6).toUpperCase()}</p>
                        {order.verificationCode && (
                            <p style={{ color: '#059669', fontWeight: 'bold', letterSpacing: 1 }}>
                                🔐 {order.verificationCode}
                            </p>
                        )}
                        <p><strong>📅 </strong>{formatDate(order.createdAt)}</p>
                            <p><strong>💰 </strong>{order.total} ₪</p>
                        </div>
                        <button type="button" className="confirm-btn" onClick={() => setDetail(order)}>عرض التفاصيل</button>
                    </div>
                ))}
            </div>

            {detail && (
                <div className="reject-dialog-overlay" onClick={() => setDetail(null)}>
                    <div className="reject-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                        <h3>تفاصيل الطلب</h3>
                        <p><strong>الزبون:</strong> {detail.customer?.name}</p>
                        <p><strong>رقم الطلب:</strong> {detail.orderNumber || detail._id.slice(-6).toUpperCase()}</p>
                        {detail.verificationCode && (
                            <p style={{ background: '#ecfdf5', padding: 10, borderRadius: 8, fontWeight: 'bold', letterSpacing: 2, color: '#059669' }}>
                                🔐 رمز التحقق: {detail.verificationCode}
                            </p>
                        )}
                        <p><strong>المنتجات:</strong></p>
                        <ul>
                            {(detail.items || []).map((i, idx) => (
                                <li key={idx}>{i.name} ×{i.quantity} — {i.price * i.quantity} ₪</li>
                            ))}
                        </ul>
                        {detail.customerNotes && <p><strong>ملاحظات الزبون:</strong> {detail.customerNotes}</p>}
                        {detail.storeNotes && <p><strong>ملاحظات المتجر:</strong> {detail.storeNotes}</p>}
                        <p><strong>الدفع:</strong> {detail.paymentStatus || 'unpaid'}</p>
                        {(detail.statusTimeline || []).length > 0 && (
                            <>
                                <p><strong>مسار الحالة:</strong></p>
                                <ul>
                                    {detail.statusTimeline.map((e, idx) => (
                                        <li key={idx}>{e.status} — {formatDate(e.at)}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                        <button type="button" className="reject-dialog__cancel" onClick={() => setDetail(null)}>إغلاق</button>
                    </div>
                </div>
            )}
        </div>
    );
}
