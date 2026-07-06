import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
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

      <aside className="sidebar">
        <h2 className="logo">{isSupplier ? "لوحة التاجر" : "لوحة المحل"}</h2>

        <nav>
          <NavLink to={baseRoute} end>🏠 <span>الرئيسية</span></NavLink>
          <NavLink to={`${baseRoute}/my-store`}>
            {isSupplier ? "🏬" : "🏪"} <span>{isSupplier ? "مستودعي" : "متجري"}</span>
          </NavLink>
          <NavLink to={`${baseRoute}/add-product-offer`}>📋 <span>اضافة منتج/عرض</span></NavLink>
          <NavLink to={`${baseRoute}/offers`}>🏷️ <span>إدارة العروض</span></NavLink>

          <NavLink to={`${baseRoute}/notifications`}>
            🔔 <span>الإشعارات</span>
            <SidebarBadge count={badges.notifications} />
          </NavLink>

          <NavLink to={`${baseRoute}/orders`}>
            📋 <span>الطلبيات</span>
            <SidebarBadge count={badges.orders} />
          </NavLink>

          <NavLink to={`${baseRoute}/chats`}>
            💬 <span>الدردشات</span>
            <SidebarBadge count={badges.chats} />
          </NavLink>

          {!isSupplier && isStoreOwner && (
            <>
              {storePages.cart && (
                <NavLink to={`${baseRoute}/cart`}>🛒 <span>السلة</span></NavLink>
              )}
              {storePages.competitions && (
                <NavLink to={`${baseRoute}/competitions`}>🏆 <span>إضافة مسابقة</span></NavLink>
              )}
              <NavLink to={`${baseRoute}/buy-codes`}>🎟️ <span>شراء أكواد</span></NavLink>
              <NavLink to={`${baseRoute}/code-stats`}>🔑 <span>بصمة الأكواد</span></NavLink>
              {storePages.memberPrizes && (
                <NavLink to={`${baseRoute}/member-prizes`}>🎁 <span>جوائز الأعضاء</span></NavLink>
              )}
              {storePages.warehouses && (
                <NavLink to={`${baseRoute}/warehouses`}>🏢 <span>المستودعات</span></NavLink>
              )}
            </>
          )}

          <NavLink to={`${baseRoute}/support`}>🎧 <span>الدعم الفني</span></NavLink>
          <NavLink to={`${baseRoute}/profile`}>👤 <span>الملف الشخصي</span></NavLink>

          <button type="button" className="logout-link" onClick={logout}>
            🚪 <span>تسجيل الخروج</span>
          </button>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="welcome-msg">
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
    </div>
  );
}
