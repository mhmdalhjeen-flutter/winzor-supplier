import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/dashboard.css";
import useDashboardBadges from "../hooks/useDashboardBadges";
import useStoreOwnerPermissions from "../hooks/useStoreOwnerPermissions";
import DashboardHeaderActions, { SidebarBadge } from "../components/DashboardHeaderActions";
import StoreWelcomeModal from "../components/StoreWelcomeModal";
import { getMyStore } from "../services/store.service";
import { getStoredUser } from "../utils/safeStorage";
import { logout as authLogout } from "../utils/auth";

export default function DashboardLayout() {
  const user = getStoredUser({});
  const navigate = useNavigate();
  const badges = useDashboardBadges();
  const { permissions: storePages, isStoreOwner } = useStoreOwnerPermissions();

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [suggestedDefaults, setSuggestedDefaults] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  const isSupplier = user?.role === "supplier";
  const baseRoute = isSupplier ? "/supplier" : "/store";

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

      <NavLink to={`${baseRoute}/notifications`} onClick={() => setMenuOpen(false)}>
        🔔 <span>الإشعارات</span>
        <SidebarBadge count={badges.notifications} />
      </NavLink>

      <NavLink to={`${baseRoute}/orders`} onClick={() => setMenuOpen(false)}>
        📋 <span>الطلبيات</span>
        <SidebarBadge count={badges.orders} />
      </NavLink>

      <NavLink to={`${baseRoute}/chats`} onClick={() => setMenuOpen(false)}>
        💬 <span>الدردشات</span>
        <SidebarBadge count={badges.chats} />
      </NavLink>

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
        <h2 className="logo">{isSupplier ? "لوحة التاجر" : "لوحة المحل"}</h2>
        <nav>{renderNavLinks()}</nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="welcome-msg">
            <button
              type="button"
              className="menu-toggle"
              aria-label="فتح القائمة"
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
            {storeData?.logo ? (
              <img src={storeData.logo} alt="" className="topbar-store-logo" />
            ) : null}
            <span>مرحباً {user?.name} 👋</span>
          </div>

          <div className="topbar-end">
            <DashboardHeaderActions badges={badges} baseRoute={baseRoute} navigate={navigate} />
            <div className="user-badge">{isSupplier ? "تاجر" : "صاحب محل"}</div>
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
        </NavLink>
        <NavLink to={`${baseRoute}/chats`}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">الدردشات</span>
        </NavLink>
        <button type="button" onClick={() => setMenuOpen(true)}>
          <span className="nav-icon">☰</span>
          <span className="nav-label">المزيد</span>
        </button>
      </nav>
    </div>
  );
}
