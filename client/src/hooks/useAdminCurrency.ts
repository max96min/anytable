import { useQuery } from '@tanstack/react-query';
import { formatPrice } from '@anytable/shared';
import { getStore } from '@/lib/admin-api';

export function useAdminCurrency() {
  const { data: store } = useQuery({
    queryKey: ['admin-store'],
    queryFn: getStore,
  });

  const currency = (store?.settings?.currency) || 'KRW';

  const format = (amount: number): string => {
    return formatPrice(amount, currency);
  };

  return { currency, format };
}
