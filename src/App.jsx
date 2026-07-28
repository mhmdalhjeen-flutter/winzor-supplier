import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import NotAuthorized from "./pages/not-authorized";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import StoreFeatureRoute from "./routes/StoreFeatureRoute";
import StoreOnlyRoute from "./routes/StoreOnlyRoute";
import Maintenance from "./pages/Maintenance";
import useMaintenanceMode from "./hooks/useMaintenanceMode";
import LightLoadingHint from "./shared/LightLoadingHint";
import PwaHost from "./components/pwa/PwaHost";
import PwaShortcutHandler from "./components/pwa/PwaShortcutHandler";
import BrandSplashGate from "./components/BrandSplashGate";
import { PwaInstallProvider } from "./context/PwaInstallContext";

const DashboardHome = lazy(() => import("./pages/storeOwner/DashboardHome"));
const MyStore = lazy(() => import("./pages/MyStore"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const OrderInvoices = lazy(() => import("./pages/OrderInvoices"));
const Chats = lazy(() => import("./pages/Chats"));
const Cart = lazy(() => import("./pages/Cart"));
const Competitions = lazy(() => import("./pages/Competitions"));
const BuyCodes = lazy(() => import("./pages/BuyCodes"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const WarehouseDetail = lazy(() => import("./pages/WarehouseDetail"));
const ItemDetails = lazy(() => import("./pages/ItemDetails"));
const Support = lazy(() => import("./pages/Support"));
const Profile = lazy(() => import("./pages/Profile"));
const AddProductOffer = lazy(() => import("./pages/storeOwner/AddProductsOffers"));
const PendingUploads = lazy(() => import("./pages/storeOwner/PendingUploads"));
const MemberPrizes = lazy(() => import("./pages/storeOwner/MemberPrizes"));
const OffersManager = lazy(() => import("./pages/storeOwner/OffersManager"));
const Notifications = lazy(() => import("./pages/Notifications"));

const LazyPage = ({ children }) => (
  <Suspense fallback={<LightLoadingHint />}>{children}</Suspense>
);

function MerchantApp() {
  const location = useLocation();
  const splashActive = /^\/(store|supplier)\/?$/.test(location.pathname);

  return (
    <BrandSplashGate active={splashActive}>
      <Routes>
      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/not-authorized" element={<NotAuthorized />} />
      <Route path="/" element={<Navigate to="/login" />} />

      {/* STORE ROUTES */}
      <Route
        path="/store/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LazyPage><DashboardHome /></LazyPage>} />
        <Route path="my-store" element={<LazyPage><MyStore /></LazyPage>} />
        <Route path="orders" element={<LazyPage><Orders /></LazyPage>} />
        <Route path="orders/history" element={<LazyPage><OrderHistory /></LazyPage>} />
        <Route path="orders/invoices" element={<LazyPage><OrderInvoices /></LazyPage>} />
        <Route path="chats" element={<LazyPage><Chats /></LazyPage>} />
        <Route path="cart" element={<StoreOnlyRoute><StoreFeatureRoute feature="cart"><LazyPage><Cart /></LazyPage></StoreFeatureRoute></StoreOnlyRoute>} />
        <Route path="competitions" element={<StoreOnlyRoute><StoreFeatureRoute feature="competitions"><LazyPage><Competitions /></LazyPage></StoreFeatureRoute></StoreOnlyRoute>} />
        <Route path="buy-codes" element={<StoreOnlyRoute><LazyPage><BuyCodes /></LazyPage></StoreOnlyRoute>} />
        <Route path="member-prizes" element={<StoreOnlyRoute><StoreFeatureRoute feature="memberPrizes"><LazyPage><MemberPrizes /></LazyPage></StoreFeatureRoute></StoreOnlyRoute>} />
        <Route path="warehouses" element={<StoreOnlyRoute><StoreFeatureRoute feature="warehouses"><LazyPage><Warehouses /></LazyPage></StoreFeatureRoute></StoreOnlyRoute>} />
        <Route path="warehouses/:id" element={<StoreOnlyRoute><StoreFeatureRoute feature="warehouses"><LazyPage><WarehouseDetail /></LazyPage></StoreFeatureRoute></StoreOnlyRoute>} />
        <Route path="item-details/:id" element={<LazyPage><ItemDetails /></LazyPage>} />
        <Route path="support" element={<LazyPage><Support /></LazyPage>} />
        <Route path="profile" element={<LazyPage><Profile /></LazyPage>} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="add-product-offer" element={<LazyPage><AddProductOffer /></LazyPage>} />
        <Route path="pending-uploads" element={<LazyPage><PendingUploads /></LazyPage>} />
        <Route path="offers" element={<LazyPage><OffersManager /></LazyPage>} />
        <Route path="notifications" element={<LazyPage><Notifications /></LazyPage>} />
      </Route>

      {/* SUPPLIER ROUTES */}
      <Route
        path="/supplier/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LazyPage><DashboardHome /></LazyPage>} />
        <Route path="my-store" element={<LazyPage><MyStore /></LazyPage>} />
        <Route path="orders" element={<LazyPage><Orders /></LazyPage>} />
        <Route path="orders/history" element={<LazyPage><OrderHistory /></LazyPage>} />
        <Route path="orders/invoices" element={<LazyPage><OrderInvoices /></LazyPage>} />
        <Route path="chats" element={<LazyPage><Chats /></LazyPage>} />
        <Route path="cart" element={<Navigate to="/supplier" replace />} />
        <Route path="competitions" element={<Navigate to="/supplier" replace />} />
        <Route path="buy-codes" element={<Navigate to="/supplier" replace />} />
        <Route path="member-prizes" element={<Navigate to="/supplier" replace />} />
        <Route path="warehouses" element={<Navigate to="/supplier" replace />} />
        <Route path="warehouses/:id" element={<Navigate to="/supplier" replace />} />
        <Route path="item-details/:id" element={<LazyPage><ItemDetails /></LazyPage>} />
        <Route path="support" element={<LazyPage><Support /></LazyPage>} />
        <Route path="profile" element={<LazyPage><Profile /></LazyPage>} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="add-product-offer" element={<LazyPage><AddProductOffer /></LazyPage>} />
        <Route path="pending-uploads" element={<LazyPage><PendingUploads /></LazyPage>} />
        <Route path="offers" element={<LazyPage><OffersManager /></LazyPage>} />
        <Route path="notifications" element={<LazyPage><Notifications /></LazyPage>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrandSplashGate>
  );
}

export default function App() {
  const { maintenance } = useMaintenanceMode();

  if (maintenance.enabled) {
    return (
      <Routes>
        <Route path="/maintenance" element={<Maintenance message={maintenance.message} />} />
        <Route path="*" element={<Navigate to="/maintenance" replace />} />
      </Routes>
    );
  }

  return (
    <PwaInstallProvider>
      <PwaShortcutHandler />
      <MerchantApp />
      <PwaHost />
    </PwaInstallProvider>
  );
}
