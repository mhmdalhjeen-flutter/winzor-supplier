import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../services/api';
import '../styles/dashboard.css';
import '../styles/Orders.css';
import { unwrapList } from '../utils/unwrapList';
import LightLoadingHint from '../shared/LightLoadingHint';

const STATUS_MAP = {
    pending:               { label: 'بانتظار التأكيد',      color: '#f59e0b' },
    store_accepted:        { label: 'تم قبول المتجر',       color: '#10b981' },
    confirmed:             { label: 'تم التأكيد',           color: '#10b981' },
    preparing:             { label: 'قيد التحضير',          color: '#3b82f6' },
    delivered_to_driver:   { label: 'تم التسليم للسائق',    color: '#6366f1' },
    delivered_to_customer: { label: 'تم التسليم للزبون',    color: '#059669' },
    delivered:             { label: 'تم التسليم',           color: '#059669' },
    completed_off_platform: { label: 'اكتمل خارج المنصة',   color: '#64748b' },
};

const STATUS_OPTIONS = [
    { value: '', label: 'كل الحالات' },
    { value: 'pending', label: 'بانتظار التأكيد' },
    { value: 'store_accepted', label: 'تم قبول المتجر' },
    { value: 'preparing', label: 'قيد التحضير' },
    { value: 'delivered_to_driver', label: 'تم التسليم للسائق' },
    { value: 'delivered_to_customer', label: 'تم التسليم للزبون' },
    { value: 'completed_off_platform', label: 'اكتمل خارج المنصة' },
];

export default function OrderInvoices() {
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
        queryKey: ['storeOrderInvoices', params],
        queryFn: async () => {
            const res = await axios.get(`/orders/store/invoices?${params}`);
            return res.data;
        },
        staleTime: 30 * 1000,
    });

    const orders = unwrapList(data, ['orders']);
    const storeName = data?.storeName || '';

    const formatDate = (iso) =>
        iso ? new Date(iso).toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : '—';

    return (
        <div className="orders-page">
            <h2 className="title">🧾 فواتير الطلبات المؤكدة</h2>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
                سجل دائم للطلبات التي أكّدها الزبائن — يتضمن رمز التحقق للتسليم اليدوي.
                {storeName ? ` (${storeName})` : ''}
            </p>

            <div className="orders-filters" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
                <input
                    type="search"
                    placeholder="بحث برقم الطلب أو رمز التحقق..."
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

            {isLoading && <LightLoadingHint label="جاري تحميل الفواتير..." />}
            {isError && <p style={{ color: '#ef4444' }}>تعذّر تحميل الفواتير</p>}

            {!isLoading && orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>لا توجد فواتير بعد</div>
            )}

            <div className="orders-list">
                {orders.map(order => {
                    const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    return (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <h3>{order.customer?.name || 'زبون'}</h3>
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
                                        borderRadius: 10,
                                        padding: '8px 12px',
                                        fontWeight: 'bold',
                                        letterSpacing: 2,
                                        color: '#059669',
                                    }}>
                                        🔐 رمز التحقق: {order.verificationCode}
                                    </p>
                                )}
                                <p><strong>📞 الزبون: </strong>{order.customer?.phone || '—'}</p>
                                <p><strong>📦 العناصر: </strong>
                                    {(order.items || []).map(i => `${i.name} (×${i.quantity})`).join('، ')}
                                </p>
                                <p><strong>💰 الإجمالي: </strong>{order.total} ₪</p>
                                <p><strong>📅 التاريخ: </strong>{formatDate(order.createdAt)}</p>
                            </div>
                            <button type="button" className="confirm-btn" onClick={() => setDetail(order)}>
                                عرض الفاتورة
                            </button>
                        </div>
                    );
                })}
            </div>

            {detail && (
                <div className="reject-dialog-overlay" onClick={() => setDetail(null)}>
                    <div className="reject-dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                        <h3>🧾 فاتورة الطلب</h3>
                        <p><strong>رقم الطلب:</strong> {detail.orderNumber || detail._id.slice(-6).toUpperCase()}</p>
                        {detail.verificationCode && (
                            <p style={{
                                background: '#ecfdf5',
                                border: '1px solid #bbf7d0',
                                borderRadius: 10,
                                padding: '10px 14px',
                                fontWeight: 'bold',
                                fontSize: 18,
                                letterSpacing: 3,
                                color: '#059669',
                                textAlign: 'center',
                            }}>
                                {detail.verificationCode}
                            </p>
                        )}
                        <p><strong>الزبون:</strong> {detail.customer?.name} — {detail.customer?.phone}</p>
                        {detail.customer?.email && <p><strong>البريد:</strong> {detail.customer.email}</p>}
                        <p><strong>الحالة:</strong> {STATUS_MAP[detail.status]?.label || detail.status}</p>
                        <p><strong>التاريخ:</strong> {formatDate(detail.createdAt)}</p>
                        {detail.customerNotes && <p><strong>ملاحظات الزبون:</strong> {detail.customerNotes}</p>}
                        {detail.storeNotes && <p><strong>ملاحظات المتجر:</strong> {detail.storeNotes}</p>}
                        <p><strong>العناصر:</strong></p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th style={{ padding: 8, textAlign: 'right' }}>العنصر</th>
                                    <th style={{ padding: 8 }}>الكمية</th>
                                    <th style={{ padding: 8 }}>السعر</th>
                                    <th style={{ padding: 8 }}>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(detail.items || []).map((i, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: 8 }}>{i.name}</td>
                                        <td style={{ padding: 8, textAlign: 'center' }}>{i.quantity}</td>
                                        <td style={{ padding: 8, textAlign: 'center' }}>{i.price} ₪</td>
                                        <td style={{ padding: 8, textAlign: 'center' }}>{i.price * i.quantity} ₪</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ padding: 8, fontWeight: 'bold', textAlign: 'left' }}>الإجمالي</td>
                                    <td style={{ padding: 8, fontWeight: 'bold', textAlign: 'center', color: '#059669' }}>{detail.total} ₪</td>
                                </tr>
                            </tfoot>
                        </table>
                        <button type="button" className="reject-dialog__cancel" style={{ marginTop: 16 }} onClick={() => setDetail(null)}>
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
