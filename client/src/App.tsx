import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SessionProvider } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SocketProvider } from '@/context/SocketContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { SystemAuthProvider } from '@/context/SystemAuthContext';
import { CustomerLayout, AdminLayout, SystemLayout } from '@/components/layout';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';

// Customer pages
const QREntryPage = lazy(() => import('@/pages/customer/QREntryPage'));
const ShortCodeEntryPage = lazy(() => import('@/pages/customer/ShortCodeEntryPage'));
const MenuBrowsingPage = lazy(() => import('@/pages/customer/MenuBrowsingPage'));
const MenuDetailPage = lazy(() => import('@/pages/customer/MenuDetailPage'));
const AllergenFilterPage = lazy(() => import('@/pages/customer/AllergenFilterPage'));
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'));
const SharedCartPage = lazy(() => import('@/pages/customer/SharedCartPage'));
const OrderStatusPage = lazy(() => import('@/pages/customer/OrderStatusPage'));
const OrderSummaryPage = lazy(() => import('@/pages/customer/OrderSummaryPage'));

// Admin pages
const AdminLoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const OrderDashboardPage = lazy(() => import('@/pages/admin/OrderDashboardPage'));
const TableManagementPage = lazy(() => import('@/pages/admin/TableManagementPage'));
const MenuManagementPage = lazy(() => import('@/pages/admin/MenuManagementPage'));
const MenuEditorPage = lazy(() => import('@/pages/admin/MenuEditorPage'));
const TranslationEditorPage = lazy(() => import('@/pages/admin/TranslationEditorPage'));
const AnalyticsDashboardPage = lazy(() => import('@/pages/admin/AnalyticsDashboardPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));

// System pages
const SystemLoginPage = lazy(() => import('@/pages/system/LoginPage'));
const SystemDashboardPage = lazy(() => import('@/pages/system/DashboardPage'));
const SystemStoreListPage = lazy(() => import('@/pages/system/StoreListPage'));
const SystemStoreDetailPage = lazy(() => import('@/pages/system/StoreDetailPage'));
const SystemOwnerListPage = lazy(() => import('@/pages/system/OwnerListPage'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-surface-light">
    <Spinner size="lg" />
  </div>
);

const RootRedirect: React.FC = () => {
  const { isInSession } = useSession();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isInSession) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-light px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-white text-3xl">restaurant</span>
      </div>
      <h1 className="text-2xl font-bold text-surface-dark mb-2">AnyTable</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs mb-6">
        {t('session.scan_qr')}
      </p>
      <button
        onClick={() => navigate('/code')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">dialpad</span>
        {t('session.enter_table_code')}
      </button>
    </div>
  );
};

const SocketWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionToken } = useSession();
  return (
    <SocketProvider sessionToken={sessionToken}>
      {children}
    </SocketProvider>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* QR Entry */}
        <Route path="/t/:qrToken" element={<QREntryPage />} />
        <Route path="/code" element={<ShortCodeEntryPage />} />

        {/* Customer routes with bottom nav */}
        <Route element={<CustomerLayout />}>
          <Route path="/menu" element={<MenuBrowsingPage />} />
          <Route path="/cart" element={<SharedCartPage />} />
          <Route path="/status" element={<OrderStatusPage />} />
          <Route path="/preferences" element={<ProfilePage />} />
        </Route>

        {/* Customer routes without bottom nav */}
        <Route path="/preferences/allergens" element={<AllergenFilterPage />} />
        <Route path="/menu/:menuId" element={<MenuDetailPage />} />
        <Route path="/summary" element={<OrderSummaryPage />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/orders" replace />} />
          <Route path="orders" element={<OrderDashboardPage />} />
          <Route path="tables" element={<TableManagementPage />} />
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="menu/:menuId" element={<MenuEditorPage />} />
          <Route path="menu/:menuId/translations" element={<TranslationEditorPage />} />
          <Route path="analytics" element={<AnalyticsDashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* System routes */}
        <Route path="/system/login" element={<SystemLoginPage />} />
        <Route path="/system" element={<SystemLayout />}>
          <Route index element={<Navigate to="/system/dashboard" replace />} />
          <Route path="dashboard" element={<SystemDashboardPage />} />
          <Route path="stores" element={<SystemStoreListPage />} />
          <Route path="stores/:storeId" element={<SystemStoreDetailPage />} />
          <Route path="owners" element={<SystemOwnerListPage />} />
        </Route>

        {/* Root & fallback */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <SessionProvider>
        <CartProvider>
          <AdminAuthProvider>
            <SystemAuthProvider>
              <SocketWrapper>
                <AppRoutes />
              </SocketWrapper>
            </SystemAuthProvider>
          </AdminAuthProvider>
        </CartProvider>
      </SessionProvider>
    </LanguageProvider>
  );
};

export default App;
