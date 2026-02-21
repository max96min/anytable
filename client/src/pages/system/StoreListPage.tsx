import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSystemAuth } from '@/context/SystemAuthContext';
import { getStores, toggleStoreActive } from '@/lib/system-api';
import type { SystemStoreDTO, PaginationMeta } from '@anytable/shared';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

const StoreListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useSystemAuth();
  const [stores, setStores] = useState<SystemStoreDTO[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/system/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchStores = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await getStores({
        search: search || undefined,
        is_active: filterActive,
      });
      setStores(result.data);
      setMeta(result.meta);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, filterActive]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggle = async (storeId: string) => {
    try {
      const result = await toggleStoreActive(storeId);
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, is_active: result.is_active } : s)),
      );
    } catch {
      // ignore
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-dark">{t('system.stores')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('system.stores_desc')}</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(undefined)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterActive === undefined ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {t('system.all')}
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterActive === true ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {t('system.active')}
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterActive === false ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {t('system.inactive')}
          </button>
        </div>
      </div>

      {/* Store List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {t('common.no_results')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {stores.map((store) => (
            <div
              key={store.id}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
            >
              <div
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => navigate(`/system/stores/${store.id}`)}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${store.is_active ? 'bg-green-50' : 'bg-gray-100'}`}>
                  <Icon name="store" size={18} className={store.is_active ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-dark truncate">{store.name}</p>
                  <p className="text-xs text-gray-400 truncate">{store.owner.name} &middot; {store.owner.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {store.is_active ? t('system.active') : t('system.inactive')}
                </span>
                <button
                  onClick={() => handleToggle(store.id)}
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
          ))}
        </div>
      )}

      {/* Pagination info */}
      {meta && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {t('system.showing', { count: stores.length, total: meta.total })}
        </p>
      )}
    </div>
  );
};

export default StoreListPage;
