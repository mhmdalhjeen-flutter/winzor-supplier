import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Home } from "lucide-react";
import "../styles/dashboard.css";
import useDashboardBadges from "../hooks/useDashboardBadges";
import useStoreOwnerPermissions from "../hooks/useStoreOwnerPermissions";
import DashboardHeaderActions, { BottomNavBadge } from "../components/DashboardHeaderActions";
import { BRAND_LOGO_64, BRAND_NAME, BRAND_TAGLINE } from "../utils/brandAssets";
import StoreWelcomeModal from "../components/StoreWelcomeModal";
import SubscriptionExpiredGate from "../components/SubscriptionExpiredGate";
import { usePwaInstall } from "../context/PwaInstallContext";
import { getMyStore } from "../services/store.service";
import { getStoredUser } from "../utils/safeStorage";
import { logout as authLogout } from "../utils/auth";
import { queryKeys } from "../lib/queryClient";

export default function DashboardLayout() {
  const user = getStoredUser({});
  const navigate = useNavigate();
  const badges = useDashboardBadges();
  const { canInstall, openInstallCard } = usePwaInstall();
  const { permissions: storePages, isStoreOwner } = useStoreOwnerPermissions();

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [suggestedDefaults, setSuggestedDefaults] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: storeQueryData } = useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async () => {
      const { data } = await getMyStore();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const storeData = storeQueryData?.store ?? null;

  const location = useLocation();

  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const isSupportPage = location.pathname === `${baseRoute}/support`;
  const subscriptionExpired =
    !isSupplier && isStoreOwner && storeData && storeData.subscriptionActive === false && !isSupportPage;

  useEffect(() => {
    if (!storeQueryData) return;
    setSuggestedDefaults(storeQueryData.suggestedDefaults);
    if (storeQueryData.needsWelcome) setWelcomeOpen(true);
  }, [storeQueryData]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", menuOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);

  const logout = async () => {
    await authLogout();
    navigate("/login", { replace: true });
  };

  const refreshStoreAfterWelcome = async () => {
    setWelcomeOpen(false);
  };

  const renderNavLinks = () => (
    <>
      <NavLink to={baseRoute} end onClick={() => setMenuOpen(false)}>🏠 <span>الرئيسية</span></NavLink>
      <NavLink to={`${baseRoute}/my-store`} onClick={() => setMenuOpen(false)}>
        {isSupplier ? "🏬" : "🏪"} <span>{isSupplier ? "مستودعي" : "متجري"}</span>
      </NavLink>
      <NavLink to={`${baseRoute}/add-product-offer`} onClick={() => setMenuOpen(false)}>📋 <span>إضافة عنصر/عرض</span></NavLink>
      <NavLink to={`${baseRoute}/drafts`} onClick={() => setMenuOpen(false)}>📝 <span>المسودات</span></NavLink>
      <NavLink to={`${baseRoute}/pending-uploads`} onClick={() => setMenuOpen(false)}>⏳ <span>العمليات المعلقة</span></NavLink>

      {!isSupplier && isStoreOwner && (
        <>
          {storePages.cart && (
            <NavLink to={`${baseRoute}/cart`} onClick={() => setMenuOpen(false)}>🛒 <span>السلة</span></NavLink>
          )}
          {storePages.competitions && (
            <NavLink to={`${baseRoute}/competitions`} onClick={() => setMenuOpen(false)}>🏆 <span>إضافة مسابقة</span></NavLink>
          )}
          <NavLink to={`${baseRoute}/buy-codes`} onClick={() => setMenuOpen(false)}>🎟️ <span>شراء أكواد</span></NavLink>
          {storePages.memberPrizes && (
            <NavLink to={`${baseRoute}/member-prizes`} onClick={() => setMenuOpen(false)}>🎁 <span>جوائز الأعضاء</span></NavLink>
          )}
          {storePages.warehouses && (
            <NavLink to={`${baseRoute}/warehouses`} onClick={() => setMenuOpen(false)}>🏢 <span>المستودعات</span></NavLink>
          )}
        </>
      )}

      <NavLink to={`${baseRoute}/support`} onClick={() => setMenuOpen(false)}>🎧 <span>الدعم الفني</span></NavLink>
      <NavLink to={`${baseRoute}/profile`} onClick={() => setMenuOpen(false)}>👤 <span>الملف الشخصي</span></NavLink>
      {!isSupplier && isStoreOwner && (
        <NavLink to={`${baseRoute}/payment-settings`} onClick={() => setMenuOpen(false)}>💳 <span>إعدادات الدفع</span></NavLink>
      )}

      {canInstall && (
        <button
          type="button"
          className="logout-link sidebar-install-btn"
          onClick={() => {
            setMenuOpen(false);
            openInstallCard();
          }}
        >
          📲 <span>تثبيت التطبيق</span>
        </button>
      )}

      <button type="button" className="logout-link" onClick={logout}>
        🚪 <span>تسجيل الخروج</span>
      </button>
    </>
  );

  return (
    <div className={`dashboard${subscriptionExpired ? " dashboard--subscription-expired" : ""}`}>
      <StoreWelcomeModal
        open={welcomeOpen && !subscriptionExpired}
        store={storeData}
        suggestedDefaults={suggestedDefaults}
        baseRoute={baseRoute}
        navigate={navigate}
        onDone={refreshStoreAfterWelcome}
      />

      {!subscriptionExpired && menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {!subscriptionExpired && (
        <aside className={`sidebar${menuOpen ? " open" : ""}`}>
          <div className="sidebar-brand">
            {!isSupplier && storeData ? (
              <>
                {storeData.logo ? (
                  <img
                    src={storeData.logo}
                    alt={storeData.name || "شعار المتجر"}
                    width={48}
                    height={48}
                    className="sidebar-brand__logo sidebar-brand__logo--store"
                  />
                ) : (
                  <div className="sidebar-brand__logo sidebar-brand__logo--store sidebar-brand__logo--fallback" aria-hidden>
                    {(storeData.name || "م").charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="logo sidebar-brand__store-name">{storeData.name || "متجري"}</h2>
                  <p className="sidebar-brand__tagline">لوحة المتجر</p>
                </div>
              </>
            ) : (
              <>
                <img src={BRAND_LOGO_64} alt={BRAND_NAME} width={48} height={48} className="sidebar-brand__logo" />
                <div>
                  <h2 className="logo">{BRAND_NAME}</h2>
                  <p className="sidebar-brand__tagline">{isSupplier ? "لوحة التاجر" : BRAND_TAGLINE}</p>
                </div>
              </>
            )}
          </div>
          <nav>{renderNavLinks()}</nav>
        </aside>
      )}

      <div className="main">
        {!subscriptionExpired && (
          <header className="topbar">
            <div className="topbar-start">
              <button
                type="button"
                className="menu-toggle"
                aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={menuOpen}
                onClick={toggleMenu}
              >
                <Menu size={22} strokeWidth={2} />
              </button>
              {!isSupplier ? (
                <div className="topbar-store-brand">
                  {storeData?.logo ? (
                    <img
                      src={storeData.logo}
                      alt={storeData.name || "شعار المتجر"}
                      className="topbar-store-logo"
                      width={44}
                      height={44}
                    />
                  ) : (
                    <div className="topbar-store-logo topbar-store-logo--fallback" aria-hidden>
                      {(storeData?.name || "م").charAt(0)}
                    </div>
                  )}
                  <span className="topbar-store-name">{storeData?.name || "متجري"}</span>
                </div>
              ) : (
                <img src={BRAND_LOGO_64} alt={BRAND_NAME} className="topbar-brand-logo" width={36} height={36} />
              )}
            </div>

            <div className="topbar-end">
              <DashboardHeaderActions badges={badges} baseRoute={baseRoute} navigate={navigate} />
            </div>
          </header>
        )}

        <div className="content">
          {subscriptionExpired ? (
            <SubscriptionExpiredGate navigate={navigate} baseRoute={baseRoute} />
          ) : (
            <Outlet />
          )}
        </div>
      </div>

      {!subscriptionExpired && (
        <nav className="bottom-nav" aria-label="التنقل السريع">
          <NavLink to={baseRoute} end>
            <span className="nav-icon"><Home size={20} strokeWidth={2.2} /></span>
            <span className="nav-label">الرئيسية</span>
          </NavLink>
          <NavLink to={`${baseRoute}/my-store`}>
            <span className="nav-icon">🏪</span>
            <span className="nav-label">{isSupplier ? "مستودعي" : "متجري"}</span>
          </NavLink>
          <NavLink to={`${baseRoute}/orders`}>
            <span className="nav-icon">📋</span>
            <span className="nav-label">طلبات المتجر</span>
            <BottomNavBadge count={badges.orders} />
          </NavLink>
          <NavLink to={`${baseRoute}/chats`}>
            <span className="nav-icon">💬</span>
            <span className="nav-label">الدردشات</span>
            <BottomNavBadge count={badges.chats} />
          </NavLink>
          <button type="button" className={menuOpen ? "is-active" : ""} onClick={toggleMenu}>
            <span className="nav-icon"><Menu size={18} /></span>
            <span className="nav-label">المزيد</span>
          </button>
        </nav>
      )}
    </div>
  );
}
