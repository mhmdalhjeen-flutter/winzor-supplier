import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, User } from "lucide-react";
import "../styles/dashboard.css";
import useDashboardBadges from "../hooks/useDashboardBadges";
import useStoreOwnerPermissions from "../hooks/useStoreOwnerPermissions";
import DashboardHeaderActions, { BottomNavBadge } from "../components/DashboardHeaderActions";
import { BRAND_LOGO_64, BRAND_NAME, BRAND_TAGLINE } from "../utils/brandAssets";
import StoreWelcomeModal from "../components/StoreWelcomeModal";
import { usePwaInstall } from "../context/PwaInstallContext";
import { getMyStore } from "../services/store.service";
import { getStoredUser } from "../utils/safeStorage";
import { logout as authLogout } from "../utils/auth";

export default function DashboardLayout() {
  const user = getStoredUser({});
  const navigate = useNavigate();
  const badges = useDashboardBadges();
  const { canInstall, openInstallCard } = usePwaInstall();
  const { permissions: storePages, isStoreOwner } = useStoreOwnerPermissions();

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [suggestedDefaults, setSuggestedDefaults] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";
  const isHome =
    location.pathname === baseRoute || location.pathname === `${baseRoute}/`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await getMyStore();
        if (!mounted) return;
        setStoreData(data.store);
        setSuggestedDefaults(data.suggestedDefaults);
        if (data.needsWelcome) setWelcomeOpen(true);
      } catch {
        /* لا متجر — تجاهل */
      }
    })();
    return () => { mounted = false; };
  }, []);

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
    try {
      const { data } = await getMyStore();
      setStoreData(data.store);
      setSuggestedDefaults(data.suggestedDefaults);
    } catch {
      /* ignore */
    }
  };

  const renderNavLinks = () => (
    <>
      <NavLink to={baseRoute} end onClick={() => setMenuOpen(false)}>🏠 <span>الرئيسية</span></NavLink>
      <NavLink to={`${baseRoute}/my-store`} onClick={() => setMenuOpen(false)}>
        {isSupplier ? "🏬" : "🏪"} <span>{isSupplier ? "مستودعي" : "متجري"}</span>
      </NavLink>
      <NavLink to={`${baseRoute}/add-product-offer`} onClick={() => setMenuOpen(false)}>📋 <span>اضافة منتج/عرض</span></NavLink>
      <NavLink to={`${baseRoute}/offers`} onClick={() => setMenuOpen(false)}>🏷️ <span>إدارة العروض</span></NavLink>

      {!isSupplier && isStoreOwner && (
        <>
          {storePages.cart && (
            <NavLink to={`${baseRoute}/cart`} onClick={() => setMenuOpen(false)}>🛒 <span>السلة</span></NavLink>
          )}
          {storePages.competitions && (
            <NavLink to={`${baseRoute}/competitions`} onClick={() => setMenuOpen(false)}>🏆 <span>إضافة مسابقة</span></NavLink>
          )}
          <NavLink to={`${baseRoute}/buy-codes`} onClick={() => setMenuOpen(false)}>🎟️ <span>شراء أكواد</span></NavLink>
          <NavLink to={`${baseRoute}/code-stats`} onClick={() => setMenuOpen(false)}>🔑 <span>بصمة الأكواد</span></NavLink>
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
    <div className="dashboard">
      <StoreWelcomeModal
        open={welcomeOpen}
        store={storeData}
        suggestedDefaults={suggestedDefaults}
        baseRoute={baseRoute}
        navigate={navigate}
        onDone={refreshStoreAfterWelcome}
      />

      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <img src={BRAND_LOGO_64} alt={BRAND_NAME} width={48} height={48} className="sidebar-brand__logo" />
          <div>
            <h2 className="logo">{BRAND_NAME}</h2>
            <p className="sidebar-brand__tagline">{isSupplier ? "لوحة التاجر" : BRAND_TAGLINE}</p>
          </div>
        </div>
        <nav>{renderNavLinks()}</nav>
      </aside>

      <div className="main">
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
            <img src={BRAND_LOGO_64} alt={BRAND_NAME} className="topbar-brand-logo" width={36} height={36} />
            {isHome && !isSupplier && storeData?.name ? (
              <span className="topbar-store-name">{storeData.name}</span>
            ) : null}
          </div>

          <div className="topbar-end">
            <DashboardHeaderActions badges={badges} baseRoute={baseRoute} navigate={navigate} />
            <button
              type="button"
              className="header-icon-btn header-profile-btn"
              title="الملف الشخصي"
              aria-label="الملف الشخصي"
              onClick={() => navigate(`${baseRoute}/profile`)}
            >
              <User size={22} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>

      <nav className="bottom-nav" aria-label="التنقل السريع">
        <NavLink to={baseRoute} end>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">الرئيسية</span>
        </NavLink>
        <NavLink to={`${baseRoute}/offers`}>
          <span className="nav-icon">🏷️</span>
          <span className="nav-label">العروض</span>
        </NavLink>
        <NavLink to={`${baseRoute}/orders`}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">الطلبيات</span>
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
    </div>
  );
}
