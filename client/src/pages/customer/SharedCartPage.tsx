import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Spinner from '@/components/ui/Spinner';
import useSession from '@/hooks/useSession';
import useCart from '@/hooks/useCart';
import api from '@/lib/api';
import { formatPrice } from '@anytable/shared';
import type { PlaceOrderRequest } from '@anytable/shared';
import { io, type Socket } from 'socket.io-client';

const SharedCartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, participant } = useSession();
  const { cart, loading, fetchCart, updateItem, removeItem } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [editingUsers, setEditingUsers] = useState<Map<string, string>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Listen for CART_EDITING events
  useEffect(() => {
    const sessionId = session?.id;
    const sessionToken = sessionStorage.getItem('anytable_session_token');
    if (!sessionId || !sessionToken) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token: sessionToken },
      query: { session_id: sessionId },
    });

    socket.on('CART_EDITING', (data: { participant_id: string; nickname: string; is_editing: boolean }) => {
      if (data.participant_id === participant?.id) return;
      setEditingUsers((prev) => {
        const next = new Map(prev);
        if (data.is_editing) {
          next.set(data.participant_id, data.nickname);
        } else {
          next.delete(data.participant_id);
        }
        return next;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, participant?.id]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
    } else {
      await updateItem(itemId, newQuantity);
    }
  };

  const handlePlaceOrder = async () => {
    if (!session || !participant || !cart) return;

    setPlacingOrder(true);
    try {
      const request: PlaceOrderRequest = {
        session_id: session.id,
        participant_id: participant.id,
        cart_version: cart.version,
        idempotency_key: `${session.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      await api.post(`/api/public/sessions/${session.id}/orders`, request);
      toast.success(t('cart.place_order'));
      navigate('/status', { replace: true });
    } catch {
      toast.error(t('common.something_went_wrong'));
    } finally {
      setPlacingOrder(false);
    }
  };

  const editingNames = Array.from(editingUsers.values());

  if (loading && !cart) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface-light px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-surface-dark">
              {t('menu.table_number', { number: session?.table_number ?? '' })} - {t('cart.shared_cart')}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">{t('cart.live_session')}</span>
              </span>
              {session && (
                <span className="text-xs text-gray-500">
                  {t('cart.guests', { count: session.participants_count })}
                </span>
              )}
            </div>
          </div>

          {/* Guest avatars placeholder */}
          <div className="flex -space-x-2">
            {participant && (
              <Avatar name={participant.nickname} color={participant.avatar_color} size="sm" />
            )}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="shopping_cart" size={36} className="text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-surface-dark">{t('cart.empty_cart')}</h2>
          <p className="text-sm text-gray-500 text-center">{t('cart.empty_cart_description')}</p>
          <Button variant="primary" icon="restaurant_menu" onClick={() => navigate('/menu')}>
            {t('nav.menu')}
          </Button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {/* Editing indicator */}
          {editingNames.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-xl">
              <Spinner size="sm" className="!border-blue-500 !border-t-transparent" />
              <span className="text-xs text-blue-600">
                {editingNames.map((name) => t('cart.is_adjusting', { name })).join(' ')}
              </span>
            </div>
          )}

          {/* Cart items */}
          {cart.items.map((item) => (
            <Card key={item.id} padding="sm">
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  {item.menu_image ? (
                    <img
                      src={item.menu_image}
                      alt={item.menu_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                      <Icon name="restaurant" size={20} className="text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-surface-dark truncate">
                        {item.menu_name}
                      </h3>
                      {item.selected_options.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {item.selected_options.map((o) => o.value_label).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg hover:bg-gray-100 shrink-0"
                      aria-label={t('common.delete')}
                    >
                      <Icon name="close" size={16} className="text-gray-400" />
                    </button>
                  </div>

                  {/* Added by */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.participant_avatar_color }}
                    />
                    <span className="text-[11px] text-gray-500">
                      {t('cart.added_by', { name: item.participant_nickname })}
                    </span>
                  </div>

                  {/* Price and quantity */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-primary-500">
                      {formatPrice(item.item_total)}
                    </span>
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(val) => handleQuantityChange(item.id, val)}
                      min={0}
                      max={20}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Bill summary */}
          <Card padding="md" className="mt-4">
            <h3 className="text-sm font-semibold text-surface-dark mb-3">
              {t('cart.bill_summary')}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('cart.subtotal')}</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('cart.service_charge')}</span>
                <span>{formatPrice(cart.service_charge)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('cart.tax')}</span>
                <span>{formatPrice(cart.tax)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-surface-dark">{t('cart.total')}</span>
                  <span className="text-lg font-bold text-primary-500">
                    {formatPrice(cart.grand_total)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tourist tip */}
          <Card padding="md" className="!bg-blue-50 !border-blue-200">
            <div className="flex items-start gap-3">
              <Icon name="lightbulb" size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-blue-800 mb-0.5">
                  {t('cart.tourist_tip')}
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {t('cart.tourist_tip_text')}
                </p>
              </div>
            </div>
          </Card>

          {/* Bottom actions */}
          <div className="flex gap-3 pt-2 pb-2">
            <Button
              variant="outline"
              icon="add"
              className="flex-1"
              onClick={() => navigate('/menu')}
            >
              {t('cart.add_more')}
            </Button>
            <Button
              variant="primary"
              icon="send"
              className="flex-[2]"
              loading={placingOrder}
              disabled={isEmpty}
              onClick={handlePlaceOrder}
            >
              {t('cart.place_order')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedCartPage;
