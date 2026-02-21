import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../ui';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/admin/orders', icon: 'receipt_long', label: 'Orders' },
  { to: '/admin/tables', icon: 'table_restaurant', label: 'Tables' },
  { to: '/admin/menu', icon: 'menu_book', label: 'Menu' },
  { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', label: 'Admin' },
];

const AdminBottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={24} filled={isActive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default AdminBottomNav;
