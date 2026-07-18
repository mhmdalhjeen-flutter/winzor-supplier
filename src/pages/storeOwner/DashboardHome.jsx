// src/pages/DashboardHome.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/api';
import { getDashboardOffers } from '../../services/offers.service';
import { formatOfferBadge } from '../../utils/offerPricing';
import { getStoredUser } from '../../utils/safeStorage';
import { getMyStore } from '../../services/store.service';
import { BRAND_LOGO_64 } from '../../utils/brandAssets';
import OfferPriceDisplay from '../../components/OfferPriceDisplay';
import useStoreOwnerPermissions from '../../hooks/useStoreOwnerPermissions';
import '../../styles/dashboard.css';

const STATUS_MAP = {
    pending:   { label: 'بانتظار التأكيد', color: '#f59e0b' },
    confirmed: { label: 'قيد الإرسال',     color: '#3b82f6' },
    rejected:  { label: 'مرفوض',           color: '#ef4444' },
    delivered: { label: 'تم التسليم',      color: '#10b981' },
};

export default function DashboardHome() {
    const navigate   = useNavigate();
    const user       = getStoredUser({});
    const isSupplier = user?.role === 'supplier';
    const baseRoute  = isSupplier ? '/supplier' : '/store';
    const { permissions: storePages, isStoreOwner } = useStoreOwnerPermissions();

    const [stats, setStats] = useState({ products: 0, pendingOrders: 0, messages: 0, total: 0, cards: 0, bypassCards: false });
    const [ownOffers, setOwnOffers] = useState([]);
    const [networkOffers, setNetworkOffers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [store, setStore] = useState(null);

    useEffect(() => {
        fetchStats();
        fetchActivities();
        fetchDashboardOffers();
        if (!isSupplier) {
            getMyStore()
                .then(({ data }) => setStore(data.store))
                .catch(() => {});
        }
    }, [isSupplier]);

    const fetchStats = async () => {
        try {
            const [productsRes, ordersRes, chatsRes] = await Promise.allSettled([
                axios.get('/products/my'),
                axios.get('/orders/store'),
                axios.get('/chats/unread-count'),
            ]);

            const products = productsRes.status === 'fulfilled'
                ? (productsRes.value.data.products || productsRes.value.data || []).length
                : 0;

            const orders = ordersRes.status === 'fulfilled'
                ? (ordersRes.value.data.orders || [])
                : [];

            const pendingOrders = orders.filter(o => o.status === 'pending').length;

            const unreadMsgs = chatsRes.status === 'fulfilled'
                ? (chatsRes.value.data.count || 0)
                : 0;

            const cardsCount  = ordersRes.status === 'fulfilled'
                ? (ordersRes.value.data.cards ?? 0)
                : 0;
            const bypassCards = ordersRes.status === 'fulfilled'
                ? (ordersRes.value.data.bypassCards ?? false)
                : false;

            setStats({
                products,
                pendingOrders,
                messages: unreadMsgs,
                total:    orders.reduce((s, o) => s + (o.total || 0), 0),
                cards:    cardsCount,
                bypassCards,
            });
        } catch {
        }
    };

    const fetchDashboardOffers = async () => {
        setOffersLoading(true);
        try {
            const res = await getDashboardOffers(3, 3);
            setOwnOffers(res.data.ownOffers || []);
            setNetworkOffers(res.data.networkOffers || []);
        } catch {
        } finally {
            setOffersLoading(false);
        }
    };

    const renderOfferCard = (offer, showStore = false) => (
        <div key={offer._id} className="card offer-card-mini">
            {offer.image || offer.images?.[0] ? (
                <img src={offer.image || offer.images[0]} alt={offer.title} />
            ) : (
                <div style={{
                    height: '140px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '40px',
                }}>🎁</div>
            )}
            <div className="info">
                <h3>{offer.title}</h3>
                {showStore && offer.store?.name && (
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px' }}>
                        {offer.store.name}
                    </p>
                )}
                <OfferPriceDisplay offer={offer} />
                {offer.expiresAt && (
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                        تنتهي في: {new Date(offer.expiresAt).toLocaleDateString('ar-EG')}
                    </p>
                )}
                {!offer.isActive && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>غير نشط</span>
                )}
            </div>
        </div>
    );

    const fetchActivities = async () => {
        try {
            const [ordersRes, chatsRes] = await Promise.allSettled([
                axios.get('/orders/store'),
                axios.get('/chats'),
            ]);

            const recentActivities = [];

            if (ordersRes.status === 'fulfilled') {
                const orders = (ordersRes.value.data.orders || []).slice(0, 3);
                orders.forEach(order => {
                    const statusMeta = STATUS_MAP[order.status] || STATUS_MAP.pending;
                    recentActivities.push({
                        id:   order._id,
                        icon: '📦',
                        text: `طلب من ${order.customer?.name || 'زبون'} — ${order.total} ₪ (${statusMeta.label})`,
                        time: order.createdAt,
                        color: statusMeta.color,
                    });
                });
            }

            if (chatsRes.status === 'fulfilled') {
                const conversations = (chatsRes.value.data.conversations || []).slice(0, 2);
                conversations.forEach(conversation => {
                    const other = conversation.participants?.find(p =>
                        (p._id || p)?.toString() !== (user._id || user.id)?.toString()
                    );
                    if (conversation.lastMessage?.text) {
                        recentActivities.push({
                            id:   conversation._id,
                            icon: '💬',
                            text: `رسالة من ${other?.name || 'مستخدم'}: ${conversation.lastMessage.text.slice(0, 40)}...`,
                            time: conversation.updatedAt,
                            color: '#10b981',
                        });
                    }
                });
            }

            recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivities(recentActivities.slice(0, 5));
        } catch {
        }
    };

    const formatTime = (iso) => {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso);
        if (diff < 3600000)  return `منذ ${Math.floor(diff / 60000)} دقيقة`;
        if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
        return new Date(iso).toLocaleDateString('ar-EG');
    };

    const statsCards = [
        {
            id: 1,
            label: isSupplier ? 'إجمالي منتجات المستودع' : 'إجمالي منتجات المتجر',
            value: stats.products,
            icon: '📦', color: '#3b82f6',
        },
        {
            id: 2,
            label: 'طلبات بانتظار الرد',
            value: stats.pendingOrders,
            icon: '⏳', color: '#f59e0b',
        },
        {
            id: 3,
            label: 'رسائل غير مقروءة',
            value: stats.messages,
            icon: '💬', color: '#10b981',
        },
        {
            id: 4,
            label: 'الكروت المتبقية',
            value: stats.bypassCards
                ? '∞ مسموح'
                : `${stats.cards ?? 0} كرت`,
            icon: '🎟️',
            color: stats.bypassCards
                ? '#10b981'
                : (stats.cards ?? 0) > 0 ? '#8b5cf6' : '#ef4444',
        },
    ];

    return (
        <div className="dashboard-home">
            {!isSupplier && store?.name ? (
                <div className="dashboard-home-store">
                    <img
                        src={BRAND_LOGO_64}
                        alt=""
                        className="dashboard-home-store__logo"
                        width={44}
                        height={44}
                    />
                    <div className="dashboard-home-store__text">
                        <h2 className="title dashboard-home-store__name">{store.name}</h2>
                        <p className="dashboard-home-store__subtitle">الرئيسية — نظرة عامة</p>
                    </div>
                </div>
            ) : (
                <h2 className="title">الرئيسية - نظرة عامة</h2>
            )}

            <div className="stats-grid">
                {statsCards.map(stat => (
                    <div key={stat.id} className="stat-card"
                        style={{ borderRight: `5px solid ${stat.color}` }}>
                        <div className="stat-icon"
                            style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="home-content-grid">
                <div className="activity-section">
                    <h3 className="sub-title">آخر النشاطات</h3>
                    <div className="activity-list">
                        {activities.length === 0 ? (
                            <p className="no-data">لا توجد نشاطات بعد</p>
                        ) : activities.map(act => (
                            <div key={act.id} className="activity-item">
                                <div className="activity-dot"
                                    style={{ background: act.color }} />
                                <div className="activity-text">
                                    <p>{act.icon} {act.text}</p>
                                    <span>{formatTime(act.time)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="latest-offers-home">
                <h3 className="sub-title">🎯 {isSupplier ? 'عروض مستودعي' : 'عروض متجري'}</h3>
                {offersLoading ? (
                    <p className="loading-text">⏳ جاري تحميل العروض...</p>
                ) : ownOffers.length === 0 ? (
                    <p className="no-data">لا توجد عروض نشطة — أضف عرضاً جديداً</p>
                ) : (
                    <div className="grid">
                        {ownOffers.map((offer) => renderOfferCard(offer))}
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => navigate(`${baseRoute}/offers`)}
                    style={{
                        marginTop: '12px', width: '100%', padding: '10px',
                        background: '#2563eb', color: '#fff', border: 'none',
                        borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 'bold', fontSize: '14px',
                    }}>
                    إدارة جميع العروض ←
                </button>
            </div>

            <div className="latest-offers-home" style={{ marginTop: '24px' }}>
                <h3 className="sub-title">
                    {isSupplier ? '🏪 عروض المتاجر المتابَعة' : '🏢 عروض المستودعات المتابَعة'}
                </h3>
                {offersLoading ? (
                    <p className="loading-text">⏳ جاري تحميل العروض...</p>
                ) : networkOffers.length === 0 ? (
                    <p className="no-data">
                        {isSupplier
                            ? 'لا توجد عروض في التصنيفات التي اخترتها — عدّل التفضيلات أو تابع متاجراً'
                            : 'لا توجد عروض من مستودعات — انضم لمستودع من صفحة المستودعات'}
                    </p>
                ) : (
                    <div className="grid">
                        {networkOffers.map((offer) => renderOfferCard(offer, true))}
                    </div>
                )}
                {(isSupplier || (isStoreOwner && storePages.warehouses)) && (
                <button
                    type="button"
                    onClick={() => navigate(`${baseRoute}/warehouses`)}
                    style={{
                        marginTop: '12px', width: '100%', padding: '10px',
                        background: '#0f766e', color: '#fff', border: 'none',
                        borderRadius: '8px', cursor: 'pointer',
                        fontWeight: 'bold', fontSize: '14px',
                    }}>
                    {isSupplier ? 'استكشاف المتاجر ←' : 'استكشاف المستودعات ←'}
                </button>
                )}
            </div>
        </div>
    );
}
