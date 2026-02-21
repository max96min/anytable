import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Icon } from '../ui';
import AdminBottomNav from './AdminBottomNav';

interface SidebarItem {
  to: string;
  icon: string;
  label: string;
}

const sidebarItems: SidebarItem[] = [
  { to: '/admin/orders', icon: 'receipt_long', label: 'Orders' },
  { to: '/admin/tables', icon: 'table_restaurant', label: 'Tables' },
  { to: '/admin/menu', icon: 'menu_book', label: 'Menu' },
  { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', label: 'Admin' },
];

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-light">
      {/* Desktop/tablet sidebar - hidden on mobile */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-white border-r border-gray-100 z-30">
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100">
          <span className="text-lg font-bold text-primary-500">AnyTable</span>
          <span className="text-xs text-gray-400 font-medium">Admin</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={20} filled={isActive} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="md:ml-56 pb-20 md:pb-4">
        <Outlet />
      </main>

      {/* Mobile bottom nav - hidden on desktop */}
      <div className="md:hidden">
        <AdminBottomNav />
      </div>
    </div>
  );
};

export default AdminLayout;
