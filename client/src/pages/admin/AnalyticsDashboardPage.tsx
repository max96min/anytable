import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LANGUAGE_LABELS } from '@anytable/shared';
import { getAnalytics } from '@/lib/admin-api';
import { useAdminCurrency } from '@/hooks/useAdminCurrency';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtext?: string;
  iconBg: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  iconBg,
  iconColor,
}) => (
  <Card padding="md">
    <div className="flex items-start gap-3">
      <div
        className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${iconBg}`}
      >
        <Icon name={icon} size={22} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-surface-dark mt-0.5">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  </Card>
);

const AnalyticsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { format: fp } = useAdminCurrency();

  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: getAnalytics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = analytics || {
    today_orders: 0,
    today_revenue: 0,
    active_tables: 0,
    avg_order_value: 0,
    language_distribution: {},
    popular_items: [],
  };

  // Calculate max for bar widths
  const langEntries = Object.entries(stats.language_distribution);
  const langTotal = langEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-surface-dark">
            {t('admin.analytics_dashboard')}
          </h1>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="refresh" size={22} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 py-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Icon name="error" size={40} className="text-red-400" />
            <p className="text-sm text-gray-500">{t('admin.failed_load_analytics')}</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-primary-500 font-medium"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-4xl">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon="receipt_long"
                label={t('admin.todays_orders')}
                value={String(stats.today_orders)}
                iconBg="bg-primary-50"
                iconColor="text-primary-500"
              />
              <StatCard
                icon="payments"
                label={t('admin.todays_revenue')}
                value={fp(stats.today_revenue)}
                iconBg="bg-green-50"
                iconColor="text-green-600"
              />
              <StatCard
                icon="table_restaurant"
                label={t('admin.active_tables')}
                value={String(stats.active_tables)}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <StatCard
                icon="trending_up"
                label={t('admin.avg_order_value')}
                value={fp(stats.avg_order_value)}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
              />
            </div>

            {/* Charts placeholder */}
            <Card padding="lg">
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100">
                  <Icon name="bar_chart" size={32} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-surface-dark">
                  {t('admin.charts_coming_soon')}
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {t('admin.charts_coming_soon_desc')}
                </p>
              </div>
            </Card>

            {/* Language distribution */}
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-surface-dark mb-4 flex items-center gap-2">
                <Icon name="translate" size={18} className="text-gray-500" />
                {t('admin.language_distribution')}
              </h3>
              {langEntries.length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.no_session_data')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {langEntries
                    .sort(([, a], [, b]) => b - a)
                    .map(([lang, count]) => {
                      const pct = langTotal > 0 ? (count / langTotal) * 100 : 0;
                      return (
                        <div key={lang} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-20 shrink-0">
                            {LANGUAGE_LABELS[lang] || lang}
                          </span>
                          <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-primary-400 rounded-lg transition-all"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-surface-dark">
                              {Math.round(pct)}% ({count})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>

            {/* Popular items */}
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-surface-dark mb-4 flex items-center gap-2">
                <Icon name="local_fire_department" size={18} className="text-primary-500" />
                {t('admin.popular_items')}
              </h3>
              {stats.popular_items.length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.no_order_data')}</p>
              ) : (
                <div className="flex flex-col">
                  {stats.popular_items.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.menu_id}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
                    >
                      <span
                        className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${
                          idx === 0
                            ? 'bg-primary-100 text-primary-700'
                            : idx === 1
                              ? 'bg-gray-200 text-gray-700'
                              : idx === 2
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-surface-dark truncate">
                        {item.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {t('admin.order_count', { count: item.order_count })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
