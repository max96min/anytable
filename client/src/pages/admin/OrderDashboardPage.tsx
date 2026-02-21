import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type { OrderDTO, OrderStatus, SocketEvents } from '@anytable/shared';
import { getOrders, updateOrderStatus } from '@/lib/admin-api';
import { useAdminCurrency } from '@/hooks/useAdminCurrency';
import { useAdminAuth } from '@/context/AdminAuthContext';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

type FilterTab = 'PLACED' | 'PREPARING' | 'READY' | 'SERVED';

const FILTER_TO_STATUSES: Record<FilterTab, OrderStatus[]> = {
  PLACED: ['PLACED', 'ACCEPTED'],
  PREPARING: ['PREPARING'],
  READY: ['READY'],
  SERVED: ['SERVED'],
};

// elapsedString is now inside the component to access t()

function elapsedMinutes(placedAt: string): number {
  return Math.floor((Date.now() - new Date(placedAt).getTime()) / 60_000);
}

const OrderDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { owner, accessToken } = useAdminAuth();
  const { format: fp } = useAdminCurrency();

  const elapsedString = (placedAt: string): string => {
    const diff = Date.now() - new Date(placedAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t('admin.just_now');
    if (mins < 60) return t('admin.minutes_ago', { count: mins });
    const hrs = Math.floor(mins / 60);
    return t('admin.hours_minutes_ago', { hours: hrs, minutes: mins % 60 });
  };
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>('PLACED');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [toast, setToast] = useState<{ tableNumber: number; orderId: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Fetch all orders
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => getOrders(),
    refetchInterval: 30_000,
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  // Socket connection for real-time
  useEffect(() => {
    if (!accessToken || !owner?.store_id) return;

    const socket = io('/', {
      auth: { token: accessToken },
      query: { store_id: owner.store_id, role: 'admin' },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_store', { store_id: owner.store_id });
    });

    socket.on('ORDER_PLACED' as keyof SocketEvents, (data: { order: OrderDTO }) => {
      queryClient.setQueryData<OrderDTO[]>(['admin-orders'], (old) => {
        if (!old) return [data.order];
        const exists = old.some((o) => o.id === data.order.id);
        if (exists) return old;
        return [data.order, ...old];
      });
      setToast({ tableNumber: data.order.table_number, orderId: data.order.id });
      setLastUpdated(new Date());
      // Flash the tab to pending
      setActiveTab('PLACED');
    });

    socket.on('ORDER_STATUS_CHANGED' as keyof SocketEvents, (data: { order_id: string; status: OrderStatus }) => {
      queryClient.setQueryData<OrderDTO[]>(['admin-orders'], (old) => {
        if (!old) return old;
        return old.map((o) =>
          o.id === data.order_id ? { ...o, status: data.status } : o,
        );
      });
      setLastUpdated(new Date());
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, owner?.store_id, queryClient]);

  // Dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Tick elapsed times every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Filter + search
  const filteredOrders = useMemo(() => {
    const statuses = FILTER_TO_STATUSES[activeTab];
    let result = orders.filter((o) => statuses.includes(o.status));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          `T-${o.table_number}`.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.items.some((item) => item.menu_name.toLowerCase().includes(q)),
      );
    }
    // Sort: newest first for pending, oldest first for preparing/ready
    if (activeTab === 'PLACED') {
      return result.sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
    }
    return result.sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  }, [orders, activeTab, searchQuery]);

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = { PLACED: 0, PREPARING: 0, READY: 0, SERVED: 0 };
    for (const o of orders) {
      if (o.status === 'PLACED' || o.status === 'ACCEPTED') c.PLACED++;
      else if (o.status === 'PREPARING') c.PREPARING++;
      else if (o.status === 'READY') c.READY++;
      else if (o.status === 'SERVED') c.SERVED++;
    }
    return c;
  }, [orders]);

  // Active tables count
  const activeTables = useMemo(() => {
    const tableIds = new Set(
      orders
        .filter((o) => !['SERVED', 'CANCELLED'].includes(o.status))
        .map((o) => o.table_id),
    );
    return tableIds.size;
  }, [orders]);

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      statusMutation.mutate({ orderId, status: newStatus });
      setMenuOpen(null);
    },
    [statusMutation],
  );

  const getActionButton = (order: OrderDTO) => {
    switch (order.status) {
      case 'PLACED':
        return (
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
            loading={statusMutation.isPending && statusMutation.variables?.orderId === order.id}
          >
            {t('admin.accept_order')}
          </Button>
        );
      case 'ACCEPTED':
        return (
          <Button
            variant="primary"
            size="sm"
            icon="skillet"
            onClick={() => handleStatusChange(order.id, 'PREPARING')}
            loading={statusMutation.isPending && statusMutation.variables?.orderId === order.id}
          >
            {t('admin.start_preparing')}
          </Button>
        );
      case 'PREPARING':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon="done_all"
              onClick={() => handleStatusChange(order.id, 'READY')}
              loading={statusMutation.isPending && statusMutation.variables?.orderId === order.id}
            >
              {t('admin.ready_to_serve')}
            </Button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="Print"
            >
              <Icon name="print" size={18} />
            </button>
          </div>
        );
      case 'READY':
        return (
          <Button
            variant="outline"
            size="sm"
            icon="room_service"
            onClick={() => handleStatusChange(order.id, 'SERVED')}
            loading={statusMutation.isPending && statusMutation.variables?.orderId === order.id}
          >
            {t('admin.mark_served')}
          </Button>
        );
      default:
        return null;
    }
  };

  const tabList: { key: FilterTab; label: string }[] = [
    { key: 'PLACED', label: t('admin.pending') },
    { key: 'PREPARING', label: t('admin.preparing') },
    { key: 'READY', label: t('admin.ready') },
    { key: 'SERVED', label: t('admin.completed') },
  ];

  const lastUpdatedStr = useMemo(() => {
    const diff = Date.now() - lastUpdated.getTime();
    if (diff < 60_000) return t('admin.just_now');
    const mins = Math.floor(diff / 60_000);
    return t('admin.minutes_ago', { count: mins });
  }, [lastUpdated, /* eslint-disable-line react-hooks/exhaustive-deps */ orders, t]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-surface-dark">
              {owner?.name || 'Store'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">{t('admin.live_status')}</span>
              </span>
              <span className="text-xs text-gray-400">
                {t('admin.tables_active', { count: activeTables })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon name="search" size={22} className="text-gray-600" />
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon name="refresh" size={22} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.search_orders_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Icon name="close" size={18} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6">
        <div className="flex overflow-x-auto no-scrollbar" role="tablist">
          {tabList.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'text-primary-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section header */}
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {activeTab === 'PLACED'
            ? t('admin.incoming_orders')
            : activeTab === 'PREPARING'
              ? t('admin.in_kitchen')
              : activeTab === 'READY'
                ? t('admin.ready_to_serve')
                : t('admin.completed_today')}
        </h2>
        <span className="text-xs text-gray-400">
          {t('admin.last_updated', { time: lastUpdatedStr })}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Icon name="error" size={40} className="text-red-400" />
            <p className="text-sm text-gray-500">{t('admin.failed_load_orders')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Icon name="inbox" size={48} className="text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchQuery
                ? t('admin.no_orders_search')
                : t('admin.no_status_orders', { status: activeTab.toLowerCase() })}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const mins = elapsedMinutes(order.placed_at);
              const isUrgent = mins > 15;
              const isRecent = mins < 5;

              return (
                <Card key={order.id} padding="none" className="overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-surface-dark">
                        T-{order.table_number}
                      </span>
                      <Badge variant="orange" size="sm">
                        {t('admin.round_label', { number: order.round_no })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          isUrgent
                            ? 'text-red-500'
                            : isRecent
                              ? 'text-primary-500'
                              : 'text-gray-500'
                        }`}
                      >
                        {isUrgent && (
                          <Icon name="warning" size={14} className="inline mr-0.5 align-text-bottom" />
                        )}
                        {elapsedString(order.placed_at)}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === order.id ? null : order.id)}
                          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Icon name="more_vert" size={18} className="text-gray-400" />
                        </button>
                        {menuOpen === order.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-40">
                              <button
                                onClick={() => {
                                  handleStatusChange(order.id, 'CANCELLED');
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                              >
                                <Icon name="cancel" size={16} />
                                {t('admin.cancel_order')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="px-4 pb-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-dark">
                            {item.quantity}x {item.menu_name}
                          </p>
                          {item.menu_name_secondary && (
                            <p className="text-xs text-gray-400 truncate">
                              {item.menu_name_secondary}
                            </p>
                          )}
                          {item.selected_options.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.selected_options
                                .map((opt) => opt.value_label)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {fp(item.item_total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Card footer with total + action */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        #{order.id.slice(-3).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-surface-dark">
                        {fp(order.grand_total)}
                      </span>
                    </div>
                    {getActionButton(order)}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New order toast bar */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-[slideUp_250ms_ease-out]">
          <div className="bg-surface-dark rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-sm text-white font-medium">
                {t('admin.new_order_at_table', { label: t('admin.new_order'), number: toast.tableNumber })}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('PLACED');
                setToast(null);
              }}
              className="text-sm font-bold text-primary-400 hover:text-primary-300 transition-colors px-2"
            >
              {t('admin.view')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OrderDashboardPage;
