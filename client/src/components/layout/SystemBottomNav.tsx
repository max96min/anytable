import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../ui';

interface NavItem {
  to: string;
  icon: string;
  i18nKey: string;
}

const navItems: NavItem[] = [
  { to: '/system/dashboard', icon: 'dashboard', i18nKey: 'system.dashboard' },
  { to: '/system/stores', icon: 'store', i18nKey: 'system.stores' },
  { to: '/system/owners', icon: 'group', i18nKey: 'system.owners' },
];

const SystemBottomNav: React.FC = () => {
  const { t } = useTranslation();

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
                <span>{t(item.i18nKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default SystemBottomNav;
