import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../ui';

interface NavItem {
  to: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { to: '/menu', icon: 'restaurant_menu', labelKey: 'nav.menu' },
  { to: '/cart', icon: 'shopping_cart', labelKey: 'nav.cart' },
  { to: '/status', icon: 'receipt_long', labelKey: 'nav.status' },
  { to: '/preferences', icon: 'person', labelKey: 'nav.profile' },
];

export interface CustomerBottomNavProps {
  /** Number of items in the cart, shown as a badge. */
  cartCount?: number;
}

const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({ cartCount = 0 }) => {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon name={item.icon} size={24} filled={isActive} />
                  {item.icon === 'shopping_cart' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold leading-none">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                <span>{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default CustomerBottomNav;
