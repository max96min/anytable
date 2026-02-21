import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LANGUAGE_FLAGS, SUPPORTED_CURRENCIES } from '@anytable/shared';
import type { SupportedLanguage, StoreDTO, StoreSettings } from '@anytable/shared';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getStore, updateStore, uploadMenuImage, generateMenuImage } from '@/lib/admin-api';
import i18n from '@/i18n';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';

const ADMIN_UI_LANG_KEY = 'admin_ui_language';

const ORDER_CONFIRM_MODES = ['ANYONE', 'HOST_ONLY', 'CONSENSUS'] as const;

interface StoreFormState {
  name: string;
  address: string;
  phone: string;
  default_language: SupportedLanguage;
  supported_languages: SupportedLanguage[];
  settings: StoreSettings;
}

function storeToForm(store: StoreDTO): StoreFormState {
  return {
    name: store.name,
    address: store.address ?? '',
    phone: store.phone ?? '',
    default_language: store.default_language,
    supported_languages: [...store.supported_languages],
    settings: { ...store.settings },
  };
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { owner, logout } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data: store, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-store'],
    queryFn: getStore,
  });

  const [form, setForm] = useState<StoreFormState | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoGenerating, setLogoGenerating] = useState(false);
  const [logoGenModalOpen, setLogoGenModalOpen] = useState(false);
  const [logoPrompt, setLogoPrompt] = useState('');
  const [logoGenError, setLogoGenError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [adminLang, setAdminLang] = useState<SupportedLanguage>(
    () => (localStorage.getItem(ADMIN_UI_LANG_KEY) as SupportedLanguage) || 'en',
  );
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (store && !form) {
      setForm(storeToForm(store));
      setLogoUrl(store.logo_url ?? null);
    }
  }, [store, form]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadMenuImage(file);
      setLogoUrl(url);
      // Persist immediately
      const updated = await updateStore({ logo_url: url });
      queryClient.setQueryData(['admin-store'], updated);
    } catch {
      setSaveMessage({ type: 'error', text: t('admin.settings.save_error') });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      const updated = await updateStore({ logo_url: null });
      queryClient.setQueryData(['admin-store'], updated);
      setLogoUrl(null);
    } catch {
      setSaveMessage({ type: 'error', text: t('admin.settings.save_error') });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoGenerate = async () => {
    const prompt = logoPrompt.trim();
    if (!prompt) return;
    setLogoGenerating(true);
    setLogoGenError(null);
    try {
      const url = await generateMenuImage(prompt);
      setLogoUrl(url);
      const updated = await updateStore({ logo_url: url });
      queryClient.setQueryData(['admin-store'], updated);
      setLogoGenModalOpen(false);
      setLogoPrompt('');
    } catch (err) {
      setLogoGenError(
        err instanceof Error ? err.message : t('admin.settings.logo_gen_failed'),
      );
    } finally {
      setLogoGenerating(false);
    }
  };

  const defaultLogoPrompt = form?.name
    ? `A modern, minimalist restaurant logo for "${form.name}", clean design, simple shapes, professional, on white background`
    : '';

  const saveMutation = useMutation({
    mutationFn: (data: StoreFormState) =>
      updateStore({
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        default_language: data.default_language,
        supported_languages: data.supported_languages,
        settings: data.settings,
      } as Partial<Omit<StoreDTO, 'id'>>),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-store'], updated);
      setForm(storeToForm(updated));
      setSaveMessage({ type: 'success', text: t('admin.settings.save_success') });
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: () => {
      setSaveMessage({ type: 'error', text: t('admin.settings.save_error') });
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const handleAdminLangChange = (lang: SupportedLanguage) => {
    setAdminLang(lang);
    localStorage.setItem(ADMIN_UI_LANG_KEY, lang);
    i18n.changeLanguage(lang);
  };

  const updateField = <K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateSetting = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setForm((prev) =>
      prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev,
    );
  };

  const toggleSupportedLang = (lang: SupportedLanguage) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.supported_languages.includes(lang);
      // Don't allow removing the default language
      if (has && lang === prev.default_language) return prev;
      const next = has
        ? prev.supported_languages.filter((l) => l !== lang)
        : [...prev.supported_languages, lang];
      return { ...prev, supported_languages: next };
    });
  };

  const handleSave = () => {
    if (!form) return;
    // Convert percentage inputs to 0-1 ratios
    const payload: StoreFormState = {
      ...form,
      settings: {
        ...form.settings,
        tax_rate: form.settings.tax_rate,
        service_charge_rate: form.settings.service_charge_rate,
      },
    };
    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-gray-500">{t('common.error')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  // Display percentages (0-1 stored, show as 0-100)
  const taxPercent = (form?.settings.tax_rate ?? 0) * 100;
  const servicePercent = (form?.settings.service_charge_rate ?? 0) * 100;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <h1 className="text-lg font-bold text-surface-dark">{t('admin.settings.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 py-4 max-w-2xl">
        <div className="flex flex-col gap-4">

          {/* 1. Store Information */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-dark mb-3 flex items-center gap-2">
              <Icon name="store" size={18} className="text-primary-500" />
              {t('admin.settings.store_info')}
            </h2>
            <div className="flex flex-col gap-3">
              {/* Logo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.store_logo')}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Icon name="add_photo_alternate" size={28} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      icon={logoUrl ? 'edit' : 'upload'}
                      disabled={logoUploading || logoGenerating}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoUploading
                        ? t('admin.settings.saving')
                        : logoUrl
                          ? t('admin.settings.store_logo_change')
                          : t('admin.settings.store_logo_upload')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="auto_awesome"
                      disabled={logoUploading || logoGenerating}
                      onClick={() => {
                        setLogoGenError(null);
                        if (!logoPrompt) setLogoPrompt(defaultLogoPrompt);
                        setLogoGenModalOpen(true);
                      }}
                    >
                      {t('admin.settings.logo_ai_generate')}
                    </Button>
                    {logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="delete"
                        disabled={logoUploading || logoGenerating}
                        onClick={handleLogoRemove}
                      >
                        {t('admin.settings.store_logo_remove')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Input
                label={t('admin.settings.store_name')}
                value={form?.name ?? ''}
                onChange={(e) => updateField('name', e.target.value)}
                icon="storefront"
              />
              <Input
                label={t('admin.settings.store_address')}
                value={form?.address ?? ''}
                onChange={(e) => updateField('address', e.target.value)}
                icon="location_on"
              />
              <Input
                label={t('admin.settings.store_phone')}
                value={form?.phone ?? ''}
                onChange={(e) => updateField('phone', e.target.value)}
                icon="phone"
              />
            </div>
          </Card>

          {/* 2. Language Settings */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-dark mb-3 flex items-center gap-2">
              <Icon name="translate" size={18} className="text-primary-500" />
              {t('admin.settings.language_settings')}
            </h2>
            <div className="flex flex-col gap-4">
              {/* Default Language */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.default_language')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.default_language_desc')}</p>
                <select
                  value={form?.default_language ?? 'en'}
                  onChange={(e) => {
                    const lang = e.target.value as SupportedLanguage;
                    updateField('default_language', lang);
                    // Ensure default is in supported languages
                    if (form && !form.supported_languages.includes(lang)) {
                      updateField('supported_languages', [...form.supported_languages, lang]);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supported Languages */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.supported_languages')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.supported_languages_desc')}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const checked = form?.supported_languages.includes(lang) ?? false;
                    const isDefault = form?.default_language === lang;
                    return (
                      <label
                        key={lang}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        } ${isDefault ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isDefault}
                          onChange={() => toggleSupportedLang(lang)}
                          className="sr-only"
                        />
                        <span>{LANGUAGE_FLAGS[lang]}</span>
                        <span>{LANGUAGE_LABELS[lang]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Admin UI Language */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.admin_ui_language')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.admin_ui_language_desc')}</p>
                <select
                  value={adminLang}
                  onChange={(e) => handleAdminLangChange(e.target.value as SupportedLanguage)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* 3. Order Settings */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-dark mb-3 flex items-center gap-2">
              <Icon name="receipt_long" size={18} className="text-primary-500" />
              {t('admin.settings.order_settings')}
            </h2>
            <div className="flex flex-col gap-4">
              {/* Order Confirm Mode */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.order_confirm_mode')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.order_confirm_mode_desc')}</p>
                <select
                  value={form?.settings.order_confirm_mode ?? 'ANYONE'}
                  onChange={(e) =>
                    updateSetting(
                      'order_confirm_mode',
                      e.target.value as StoreSettings['order_confirm_mode'],
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {ORDER_CONFIRM_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {t(`admin.settings.confirm_${mode.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session TTL */}
              <Input
                label={t('admin.settings.session_ttl')}
                type="number"
                min={1}
                value={form?.settings.session_ttl_minutes ?? 60}
                onChange={(e) =>
                  updateSetting('session_ttl_minutes', Math.max(1, parseInt(e.target.value) || 1))
                }
                icon="timer"
              />

              {/* Allow Additional Orders */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin.settings.allow_additional_orders')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.allow_additional_orders_desc')}
                  </p>
                </div>
                <Toggle
                  checked={form?.settings.allow_additional_orders ?? true}
                  onChange={(v) => updateSetting('allow_additional_orders', v)}
                />
              </div>
            </div>
          </Card>

          {/* 4. Billing Settings */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-dark mb-3 flex items-center gap-2">
              <Icon name="payments" size={18} className="text-primary-500" />
              {t('admin.settings.billing_settings')}
            </h2>
            <div className="flex flex-col gap-4">
              {/* Currency */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.currency')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.currency_desc')}</p>
                <select
                  value={form?.settings.currency ?? 'KRW'}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tax Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.tax_rate')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.tax_rate_desc')}</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxPercent}
                  onChange={(e) => {
                    const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                    updateSetting('tax_rate', pct / 100);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Service Charge Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin.settings.service_charge_rate')}
                </label>
                <p className="text-xs text-gray-500">{t('admin.settings.service_charge_rate_desc')}</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={servicePercent}
                  onChange={(e) => {
                    const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                    updateSetting('service_charge_rate', pct / 100);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Tax Included */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {t('admin.settings.tax_included')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.tax_included_desc')}
                  </p>
                </div>
                <Toggle
                  checked={form?.settings.tax_included ?? false}
                  onChange={(v) => updateSetting('tax_included', v)}
                />
              </div>
            </div>
          </Card>

          {/* 5. Account */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-dark mb-3 flex items-center gap-2">
              <Icon name="person" size={18} className="text-primary-500" />
              {t('admin.settings.account')}
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Icon name="person" size={20} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-dark truncate">
                  {owner?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {owner?.email || ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              fullWidth
              icon="logout"
              onClick={logout}
            >
              {t('admin.settings.logout')}
            </Button>
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-0 bg-gray-50 py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-t border-gray-200">
            {saveMessage && (
              <div
                className={`mb-2 text-sm text-center py-2 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {saveMessage.text}
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon="save"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? t('admin.settings.saving')
                : t('admin.settings.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Logo Generate Modal */}
      <Modal
        open={logoGenModalOpen}
        onClose={() => { if (!logoGenerating) setLogoGenModalOpen(false); }}
        title={t('admin.settings.logo_ai_generate')}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">{t('admin.settings.logo_gen_desc')}</p>
          <textarea
            placeholder={t('admin.settings.logo_gen_placeholder')}
            value={logoPrompt || defaultLogoPrompt}
            onChange={(e) => setLogoPrompt(e.target.value)}
            rows={3}
            disabled={logoGenerating}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400 disabled:opacity-50"
          />
          {logoGenerating && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Spinner size="sm" />
              <p className="text-sm text-blue-600">{t('admin.settings.logo_generating')}</p>
            </div>
          )}
          {logoGenError && (
            <p className="text-xs text-red-500">{logoGenError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLogoGenModalOpen(false)}
              disabled={logoGenerating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="auto_awesome"
              onClick={handleLogoGenerate}
              loading={logoGenerating}
              disabled={!(logoPrompt.trim() || defaultLogoPrompt.trim())}
            >
              {t('admin.generate_image')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
