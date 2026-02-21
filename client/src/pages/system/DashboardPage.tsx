import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSystemAuth } from '@/context/SystemAuthContext';
import { getStats } from '@/lib/system-api';
import type { PlatformStatsDTO } from '@anytable/shared';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, admin, logout } = useSystemAuth();
  const [stats, setStats] = useState<PlatformStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/system/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: t('system.total_stores'), value: stats.total_stores, icon: 'store', color: 'bg-blue-50 text-blue-600' },
    { label: t('system.active_stores'), value: stats.active_stores, icon: 'check_circle', color: 'bg-green-50 text-green-600' },
    { label: t('system.total_owners'), value: stats.total_owners, icon: 'group', color: 'bg-purple-50 text-purple-600' },
    { label: t('system.orders_today'), value: stats.orders_today, icon: 'receipt_long', color: 'bg-orange-50 text-orange-600' },
    { label: t('system.revenue_today'), value: `${(stats.revenue_today / 100).toLocaleString()}`, icon: 'payments', color: 'bg-emerald-50 text-emerald-600' },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusColor: Record<string, string> = {
    PLACED: 'bg-yellow-100 text-yellow-700',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    PREPARING: 'bg-orange-100 text-orange-700',
    READY: 'bg-green-100 text-green-700',
    SERVED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-dark">{t('system.dashboard')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('system.welcome', { name: admin?.name })}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Icon name="logout" size={18} />
          <span className="hidden sm:inline">{t('system.logout')}</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <Icon name={card.icon} size={20} />
            </div>
            <p className="text-2xl font-bold text-surface-dark">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-surface-dark">{t('system.recent_orders')}</h2>
        </div>
        {stats.recent_orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {t('system.no_orders')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recent_orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    <Icon name="receipt_long" size={18} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-dark truncate">{order.store_name}</p>
                    <p className="text-xs text-gray-400">
                      Table {order.table_number} &middot; {formatTime(order.placed_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-semibold text-surface-dark">
                    {(order.grand_total / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
