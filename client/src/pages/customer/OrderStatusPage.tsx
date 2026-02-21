import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';
import useOrders from '@/hooks/useOrders';
import useLanguage from '@/hooks/useLanguage';
import { formatPrice, LANGUAGE_LABELS, SUPPORTED_LANGUAGES, ORDER_STATUS_FLOW } from '@anytable/shared';
import type { OrderDTO, OrderStatus, SupportedLanguage } from '@anytable/shared';

const STATUS_ICONS: Record<string, string> = {
  PLACED: 'receipt',
  ACCEPTED: 'thumb_up',
  PREPARING: 'skillet',
  READY: 'done_all',
  SERVED: 'restaurant',
};

const STATUS_BADGE_VARIANT: Record<string, 'orange' | 'green' | 'red' | 'gray' | 'blue'> = {
  PLACED: 'gray',
  ACCEPTED: 'blue',
  PREPARING: 'orange',
  READY: 'green',
  SERVED: 'green',
  CANCELLED: 'red',
};

function formatElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const OrderStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useSession();
  const { orders, isLoading } = useOrders(session?.id);
  const { currentLanguage, changeLanguage } = useLanguage();

  const [activeRound, setActiveRound] = useState<number>(1);
  const [elapsed, setElapsed] = useState('0m');
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Update elapsed timer
  useEffect(() => {
    if (!session) return;
    const update = () => setElapsed(formatElapsed(session.created_at));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  const rounds = useMemo(() => {
    const roundMap = new Map<number, OrderDTO[]>();
    for (const order of orders) {
      const existing = roundMap.get(order.round_no) || [];
      existing.push(order);
      roundMap.set(order.round_no, existing);
    }
    return roundMap;
  }, [orders]);

  const roundNumbers = useMemo(() => {
    return Array.from(rounds.keys()).sort((a, b) => a - b);
  }, [rounds]);

  // Auto-select latest round
  useEffect(() => {
    if (roundNumbers.length > 0) {
      setActiveRound(roundNumbers[roundNumbers.length - 1]);
    }
  }, [roundNumbers]);

  const currentRoundOrders = rounds.get(activeRound) ?? [];
  const latestOrder = currentRoundOrders.length > 0
    ? currentRoundOrders.reduce((a, b) => (new Date(a.updated_at) > new Date(b.updated_at) ? a : b))
    : null;

  const getStatusIndex = (status: OrderStatus): number => {
    return ORDER_STATUS_FLOW.indexOf(status as typeof ORDER_STATUS_FLOW[number]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-light px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold text-surface-dark">
              {t('menu.table_number', { number: session?.table_number ?? '' })} {t('order.order_status')}
            </h1>
            <p className="text-xs text-gray-500">
              {t('order.session_timer', { time: elapsed })}
            </p>
          </div>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm"
            >
              <Icon name="language" size={18} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-700">
                {LANGUAGE_LABELS[currentLanguage]}
              </span>
            </button>

            {showLangPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLangPicker(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        changeLanguage(lang as SupportedLanguage);
                        setShowLangPicker(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        lang === currentLanguage
                          ? 'text-primary-500 bg-primary-50 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="receipt_long" size={36} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-surface-dark">{t('order.no_orders')}</h2>
          <p className="text-sm text-gray-500 text-center">{t('order.no_orders_description')}</p>
          <Button variant="primary" icon="restaurant_menu" onClick={() => navigate('/menu')}>
            {t('nav.menu')}
          </Button>
        </div>
      ) : (
        <div className="px-4">
          {/* Round tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 py-3">
            {roundNumbers.map((roundNo) => (
              <button
                key={roundNo}
                onClick={() => setActiveRound(roundNo)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeRound === roundNo
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {t('order.round', { number: roundNo })}
              </button>
            ))}
          </div>

          {/* Latest order progress */}
          {latestOrder && (
            <Card padding="md" className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-dark">
                  {t('order.latest_progress')}
                </h3>
                <Badge variant="red" size="sm">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {t('order.live')}
                  </span>
                </Badge>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {ORDER_STATUS_FLOW.map((status, i) => {
                  const statusIndex = getStatusIndex(latestOrder.status);
                  const isCompleted = i <= statusIndex;
                  const isActive = i === statusIndex;
                  const statusKey = status.toLowerCase() as 'placed' | 'accepted' | 'preparing' | 'ready' | 'served';

                  return (
                    <div key={status} className="flex items-start gap-3">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-primary-500 ring-4 ring-primary-100'
                              : isCompleted
                                ? 'bg-primary-500'
                                : 'bg-gray-200'
                          }`}
                        >
                          <Icon
                            name={STATUS_ICONS[status] || 'circle'}
                            size={16}
                            className={isCompleted ? 'text-white' : 'text-gray-400'}
                          />
                        </div>
                        {i < ORDER_STATUS_FLOW.length - 1 && (
                          <div
                            className={`w-0.5 h-6 ${
                              i < statusIndex ? 'bg-primary-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="pt-1.5 pb-3">
                        <p
                          className={`text-sm font-medium ${
                            isActive
                              ? 'text-primary-500'
                              : isCompleted
                                ? 'text-surface-dark'
                                : 'text-gray-400'
                          }`}
                        >
                          {t(`order.${statusKey}`)}
                        </p>
                        {isCompleted && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {formatTimestamp(latestOrder.updated_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Order items */}
          {currentRoundOrders.map((order) => (
            <Card key={order.id} padding="md" className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">
                  {t('order.order_number', { number: order.round_no })}
                </span>
                <Badge variant={STATUS_BADGE_VARIANT[order.status] || 'gray'} size="sm">
                  {t(`order.${order.status.toLowerCase() as 'placed' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled'}`)}
                </Badge>
              </div>

              <div className="space-y-2">
                {order.items.map((item, i) => {
                  const itemStatusKey = item.status === 'PREPARING' ? 'cooking' : item.status === 'PLACED' || item.status === 'ACCEPTED' ? 'queued' : item.status.toLowerCase();
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-surface-dark truncate">
                          {item.quantity}x {item.menu_name}
                        </span>
                      </div>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[item.status] || 'gray'}
                        size="sm"
                      >
                        {t(`order.${itemStatusKey}`, item.status)}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2 mt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">{t('order.total')}</span>
                <span className="text-sm font-bold text-surface-dark">
                  {formatPrice(order.grand_total)}
                </span>
              </div>
            </Card>
          ))}

          {/* Need something else? */}
          <Card padding="md" className="mt-4 !bg-primary-50 !border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-surface-dark">
                  {t('order.need_something')}
                </h4>
              </div>
              <Button variant="outline" size="sm" icon="support_agent">
                {t('order.call_staff')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrderStatusPage;
