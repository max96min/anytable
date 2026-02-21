import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerBottomNav from './CustomerBottomNav';
import { useContext } from 'react';
import { CartContext } from '@/context/CartContext';

export interface CustomerLayoutProps {
  /** Number of items in the cart for the badge. */
  cartCount?: number;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ cartCount }) => {
  const cartContext = useContext(CartContext);
  const itemCount =
    cartCount ??
    (cartContext?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0);

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Main content area - mobile-first, max width constrained, centered */}
      <main className="max-w-md mx-auto pb-20">
        <Outlet />
      </main>

      {/* Fixed bottom navigation */}
      <CustomerBottomNav cartCount={itemCount} />
    </div>
  );
};

export default CustomerLayout;
