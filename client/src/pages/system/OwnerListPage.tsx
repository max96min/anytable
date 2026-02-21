import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSystemAuth } from '@/context/SystemAuthContext';
import { getOwners, toggleOwnerActive, createOwner } from '@/lib/system-api';
import type { SystemOwnerDTO, PaginationMeta } from '@anytable/shared';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';

const OwnerListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useSystemAuth();
  const [owners, setOwners] = useState<SystemOwnerDTO[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  // Create form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formStoreName, setFormStoreName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/system/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchOwners = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await getOwners({
        search: search || undefined,
        is_active: filterActive,
      });
      setOwners(result.data);
      setMeta(result.meta);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, filterActive]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleToggle = async (ownerId: string) => {
    try {
      const result = await toggleOwnerActive(ownerId);
      setOwners((prev) =>
        prev.map((o) => (o.id === ownerId ? { ...o, is_active: result.is_active } : o)),
      );
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formEmail.trim() || !formPassword.trim() || !formName.trim() || !formStoreName.trim()) {
      setFormError(t('system.fill_all_fields'));
      return;
    }

    setFormLoading(true);
    try {
      await createOwner({
        email: formEmail.trim(),
        password: formPassword,
        name: formName.trim(),
        store_name: formStoreName.trim(),
      });
      setShowModal(false);
      setFormEmail('');
      setFormPassword('');
      setFormName('');
      setFormStoreName('');
      fetchOwners();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create owner');
    } finally {
      setFormLoading(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-dark">{t('system.owners')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('system.owners_desc')}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
        >
          <Icon name="add" size={18} />
          <span>{t('system.create_owner')}</span>
        </Button>
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

      {/* Owner List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {t('common.no_results')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {owners.map((owner) => (
            <div
              key={owner.id}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${owner.is_active ? 'bg-purple-50' : 'bg-gray-100'}`}>
                  <Icon name="person" size={18} className={owner.is_active ? 'text-purple-600' : 'text-gray-400'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-dark truncate">{owner.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {owner.email}
                    {owner.stores.length > 0 && (
                      <> &middot; {owner.stores.map((s) => s.name).join(', ')}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${owner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {owner.is_active ? t('system.active') : t('system.inactive')}
                </span>
                <button
                  onClick={() => handleToggle(owner.id)}
                  className="relative w-10 h-6 rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: owner.is_active ? '#22c55e' : '#d1d5db' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: owner.is_active ? 'translateX(16px)' : 'translateX(0)' }}
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
          {t('system.showing', { count: owners.length, total: meta.total })}
        </p>
      )}

      {/* Create Owner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-surface-dark">{t('system.create_owner')}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <Input
                label={t('system.owner_name')}
                icon="person"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
              />
              <Input
                label={t('admin.email')}
                icon="mail"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="owner@restaurant.com"
              />
              <Input
                label={t('admin.password')}
                icon="lock"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
              <Input
                label={t('system.store_name')}
                icon="store"
                value={formStoreName}
                onChange={(e) => setFormStoreName(e.target.value)}
                placeholder="My Restaurant"
              />

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <Icon name="error" size={18} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={formLoading}
                >
                  {t('system.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerListPage;
