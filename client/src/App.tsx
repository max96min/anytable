import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SocketProvider } from '@/context/SocketContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { CustomerLayout, AdminLayout } from '@/components/layout';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';

// Customer pages
const QREntryPage = lazy(() => import('@/pages/customer/QREntryPage'));
const MenuBrowsingPage = lazy(() => import('@/pages/customer/MenuBrowsingPage'));
const MenuDetailPage = lazy(() => import('@/pages/customer/MenuDetailPage'));
const AllergenFilterPage = lazy(() => import('@/pages/customer/AllergenFilterPage'));
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

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-surface-light">
    <Spinner size="lg" />
  </div>
);

const RootRedirect: React.FC = () => {
  const { isInSession } = useSession();

  if (isInSession) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-light px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-white text-3xl">restaurant</span>
      </div>
      <h1 className="text-2xl font-bold text-surface-dark mb-2">AnyTable</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        Scan the QR code on your table to start ordering
      </p>
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

        {/* Customer routes with bottom nav */}
        <Route element={<CustomerLayout />}>
          <Route path="/menu" element={<MenuBrowsingPage />} />
          <Route path="/cart" element={<SharedCartPage />} />
          <Route path="/status" element={<OrderStatusPage />} />
          <Route path="/preferences" element={<AllergenFilterPage />} />
        </Route>

        {/* Customer routes without bottom nav */}
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
            <SocketWrapper>
              <AppRoutes />
            </SocketWrapper>
          </AdminAuthProvider>
        </CartProvider>
      </SessionProvider>
    </LanguageProvider>
  );
};

export default App;
