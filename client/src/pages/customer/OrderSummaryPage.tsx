import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';
import useOrders from '@/hooks/useOrders';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import type { OrderDTO } from '@anytable/shared';

function formatDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const OrderSummaryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, leaveSession } = useSession();
  const { orders, isLoading } = useOrders(session?.id);
  const { format: fp } = useExchangeRate();
  const [duration, setDuration] = useState('0m');

  useEffect(() => {
    if (!session) return;
    const update = () => setDuration(formatDuration(session.created_at));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  const roundsMap = useMemo(() => {
    const map = new Map<number, OrderDTO[]>();
    for (const order of orders) {
      const existing = map.get(order.round_no) || [];
      existing.push(order);
      map.set(order.round_no, existing);
    }
    return map;
  }, [orders]);

  const roundNumbers = useMemo(() => {
    return Array.from(roundsMap.keys()).sort((a, b) => a - b);
  }, [roundsMap]);

  const grandTotal = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.grand_total, 0);
  }, [orders]);

  const handleEndSession = () => {
    leaveSession();
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 mb-3"
          aria-label={t('common.back')}
        >
          <Icon name="arrow_back" size={22} />
        </button>
        <h1 className="text-xl font-bold text-surface-dark">{t('summary.order_summary')}</h1>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="orange" size="md">
            {t('menu.table_number', { number: session?.table_number ?? '' })}
          </Badge>
          <span className="text-sm text-gray-500">
            {t('summary.session_duration')}: {duration}
          </span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Rounds */}
        {roundNumbers.map((roundNo) => {
          const roundOrders = roundsMap.get(roundNo) ?? [];
          const roundTotal = roundOrders.reduce((sum, o) => sum + o.grand_total, 0);
          const totalItems = roundOrders.reduce(
            (sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0),
            0,
          );

          return (
            <Card key={roundNo} padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-surface-dark">
                  {t('summary.round_label', { number: roundNo })}
                </h3>
                <span className="text-xs text-gray-500">
                  {t('summary.items_count', { count: totalItems })}
                </span>
              </div>

              <div className="space-y-2">
                {roundOrders.map((order) =>
                  order.items.map((item, i) => (
                    <div key={`${order.id}-${i}`} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-500 w-5 text-right shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="text-sm text-surface-dark truncate">
                          {item.menu_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 shrink-0 ml-2">
                        {fp(item.item_total)}
                      </span>
                    </div>
                  )),
                )}
              </div>

              <div className="flex justify-between pt-2 mt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {t('order.total')}
                </span>
                <span className="text-sm font-semibold text-surface-dark">
                  {fp(roundTotal)}
                </span>
              </div>
            </Card>
          );
        })}

        {/* Grand total */}
        <Card padding="lg" className="!bg-primary-50 !border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-surface-dark">
              {t('summary.grand_total')}
            </span>
            <span className="text-2xl font-bold text-primary-500">
              {fp(grandTotal)}
            </span>
          </div>
        </Card>

        {/* Thank you */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
            <Icon name="favorite" size={32} className="text-green-600" filled />
          </div>
          <p className="text-lg font-semibold text-surface-dark">
            {t('summary.thank_you')}
          </p>
        </div>

        <Button
          variant="ghost"
          fullWidth
          size="lg"
          onClick={handleEndSession}
        >
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
};

export default OrderSummaryPage;
