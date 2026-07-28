// src/pages/DashboardHome.jsx
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Eye, Clock, MessageCircle, Ticket, Package,
} from 'lucide-react';
import axios from '../../services/api';
import { getDashboardOffers } from '../../services/offers.service';
import { getStoredUser } from '../../utils/safeStorage';
import { getMyStore } from '../../services/store.service';
import OfferPriceDisplay from '../../components/OfferPriceDisplay';
import useStoreOwnerPermissions from '../../hooks/useStoreOwnerPermissions';
import { queryKeys } from '../../lib/queryClient';
import '../../styles/dashboard.css';

export default function DashboardHome() {
    const navigate   = useNavigate();
    const user       = getStoredUser({});
    const isSupplier = user?.role === 'supplier';
    const baseRoute  = isSupplier ? '/supplier' : '/store';
    const { permissions: storePages, isStoreOwner } = useStoreOwnerPermissions();

    const { data: storeResponse } = useQuery({
        queryKey: queryKeys.myStore,
        queryFn: async () => {
            const { data } = await getMyStore();
            return data;
        },
        enabled: !isSupplier,
        staleTime: 5 * 60 * 1000,
    });

    const store = storeResponse?.store;

    const { data: stats = { products: 0, pendingOrders: 0, messages: 0, cards: 0, bypassCards: false } } = useQuery({
        queryKey: queryKeys.dashboardStats,
        queryFn: async () => {
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

            return { products, pendingOrders, messages: unreadMsgs, cards: cardsCount, bypassCards };
        },
        staleTime: 60 * 1000,
    });

    const { data: offersData, isLoading: offersLoading } = useQuery({
        queryKey: queryKeys.dashboardOffers,
        queryFn: async () => {
            const res = await getDashboardOffers(3, 3);
            return {
                ownOffers: res.data.ownOffers || [],
                networkOffers: res.data.networkOffers || [],
            };
        },
        staleTime: 60 * 1000,
    });

    const ownOffers = offersData?.ownOffers || [];
    const networkOffers = offersData?.networkOffers || [];

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

    const statsCards = isSupplier
        ? [
            {
                id: 1,
                label: 'إجمالي منتجات المستودع',
                value: stats.products,
                Icon: Package,
                color: '#3b82f6',
                bg: '#eff6ff',
            },
            {
                id: 2,
                label: 'طلبات بانتظار الرد',
                value: stats.pendingOrders,
                Icon: Clock,
                color: '#f59e0b',
                bg: '#fffbeb',
            },
            {
                id: 3,
                label: 'رسائل غير مقروءة',
                value: stats.messages,
                Icon: MessageCircle,
                color: '#10b981',
                bg: '#ecfdf5',
            },
            {
                id: 4,
                label: 'الكروت المتبقية',
                value: stats.bypassCards ? '∞' : stats.cards ?? 0,
                Icon: Ticket,
                color: stats.bypassCards ? '#10b981' : (stats.cards ?? 0) > 0 ? '#8b5cf6' : '#ef4444',
                bg: stats.bypassCards ? '#ecfdf5' : '#f5f3ff',
            },
        ]
        : [
            {
                id: 1,
                label: 'عدد زوار المتجر',
                value: store?.customersCount ?? 0,
                Icon: Users,
                color: '#3b82f6',
                bg: '#eff6ff',
            },
            {
                id: 2,
                label: 'زيارات هذا الشهر',
                value: store?.monthlyVisits ?? 0,
                badge: 'هذا الشهر',
                subtitle: 'يتجدّد تلقائياً مع بداية كل شهر',
                Icon: Eye,
                color: '#6366f1',
                bg: '#eef2ff',
            },
            {
                id: 3,
                label: 'طلبات بانتظار الرد',
                value: stats.pendingOrders,
                Icon: Clock,
                color: '#f59e0b',
                bg: '#fffbeb',
            },
            {
                id: 4,
                label: 'رسائل غير مقروءة',
                value: stats.messages,
                Icon: MessageCircle,
                color: '#10b981',
                bg: '#ecfdf5',
            },
            {
                id: 5,
                label: 'الكروت المتبقية',
                value: stats.bypassCards ? '∞' : stats.cards ?? 0,
                Icon: Ticket,
                color: stats.bypassCards ? '#10b981' : (stats.cards ?? 0) > 0 ? '#8b5cf6' : '#ef4444',
                bg: stats.bypassCards ? '#ecfdf5' : '#f5f3ff',
            },
        ];

    return (
        <div className="dashboard-home">
            {!isSupplier && store?.name ? (
                <div className="dashboard-home-store">
                    {store.logo ? (
                        <img
                            src={store.logo}
                            alt={store.name}
                            className="dashboard-home-store__logo"
                        />
                    ) : (
                        <div className="dashboard-home-store__logo dashboard-home-store__logo--fallback">
                            {store.name.charAt(0)}
                        </div>
                    )}
                    <div className="dashboard-home-store__text">
                        <h2 className="title dashboard-home-store__name">{store.name}</h2>
                        <p className="dashboard-home-store__subtitle">الرئيسية — نظرة عامة</p>
                    </div>
                </div>
            ) : (
                <h2 className="title">الرئيسية - نظرة عامة</h2>
            )}

            <div className="stats-grid stats-grid--modern">
                {statsCards.map((stat) => {
                    const Icon = stat.Icon;
                    return (
                        <div key={stat.id} className="stat-card stat-card--modern">
                            <div className="stat-card__icon" style={{ background: stat.bg, color: stat.color }}>
                                <Icon size={22} strokeWidth={2.2} />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__label">
                                    {stat.label}
                                    {stat.badge ? (
                                        <span className="stat-card__month-badge">{stat.badge}</span>
                                    ) : null}
                                </span>
                                <span className="stat-card__value">{stat.value}</span>
                                {stat.subtitle ? (
                                    <span className="stat-card__subtitle">{stat.subtitle}</span>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
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
