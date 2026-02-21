import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useSystemAuth } from '@/context/SystemAuthContext';
import { getStoreDetail, toggleStoreActive } from '@/lib/system-api';
import type { SystemStoreDetailDTO } from '@anytable/shared';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

const StoreDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useSystemAuth();
  const [store, setStore] = useState<SystemStoreDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/system/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !storeId) return;
    setLoading(true);
    getStoreDetail(storeId)
      .then(setStore)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, storeId]);

  const handleToggle = async () => {
    if (!storeId) return;
    try {
      const result = await toggleStoreActive(storeId);
      setStore((prev) => (prev ? { ...prev, is_active: result.is_active } : prev));
    } catch {
      // ignore
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error || 'Store not found'}</p>
      </div>
    );
  }

  const infoItems = [
    { label: t('system.tables'), value: store.table_count, icon: 'table_restaurant' },
    { label: t('system.menus_count'), value: store.menu_count, icon: 'menu_book' },
    { label: t('system.orders_today'), value: store.orders_today, icon: 'receipt_long' },
    { label: t('system.revenue_today'), value: (store.revenue_today / 100).toLocaleString(), icon: 'payments' },
  ];

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/system/stores')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <Icon name="arrow_back" size={18} />
        {t('common.back')}
      </button>

      {/* Store Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-surface-dark">{store.name}</h1>
            {store.address && (
              <p className="text-sm text-gray-500 mt-1">{store.address}</p>
            )}
            {store.phone && (
              <p className="text-sm text-gray-400">{store.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {store.is_active ? t('system.active') : t('system.inactive')}
            </span>
            <button
              onClick={handleToggle}
              className="relative w-10 h-6 rounded-full transition-colors focus:outline-none"
              style={{ backgroundColor: store.is_active ? '#22c55e' : '#d1d5db' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: store.is_active ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </div>

        {/* Owner info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('system.owner')}</p>
          <p className="text-sm font-medium text-surface-dark">{store.owner.name}</p>
          <p className="text-xs text-gray-400">{store.owner.email}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {infoItems.map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={item.icon} size={18} className="text-gray-400" />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-surface-dark">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Store Settings */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-surface-dark mb-3">{t('system.store_info')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('system.default_language')}</span>
            <span className="text-surface-dark font-medium">{store.default_language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('system.supported_languages')}</span>
            <span className="text-surface-dark font-medium">{store.supported_languages.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('system.created_at')}</span>
            <span className="text-surface-dark font-medium">
              {new Date(store.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDetailPage;
