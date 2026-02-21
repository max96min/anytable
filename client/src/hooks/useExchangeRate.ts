import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatPrice, LANGUAGE_CURRENCY_MAP } from '@anytable/shared';
import useSession from './useSession';
import useLanguage from './useLanguage';

const DISPLAY_CURRENCY_KEY = 'anytable_display_currency';

interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
}

async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRateData> {
  const res = await fetch(`/api/exchange-rates?from=${encodeURIComponent(baseCurrency)}`);
  if (!res.ok) throw new Error('Failed to fetch exchange rates');
  const json = await res.json();
  return json.data;
}

function getStoredCurrency(): string | null {
  try {
    return sessionStorage.getItem(DISPLAY_CURRENCY_KEY);
  } catch {
    return null;
  }
}

export function useExchangeRate() {
  const { store } = useSession();
  const { currentLanguage } = useLanguage();

  const storeCurrency = (store?.settings?.currency) || 'KRW';

  // Resolve display currency: stored pref > language-based > USD fallback
  const langCurrency = LANGUAGE_CURRENCY_MAP[currentLanguage] || 'USD';
  const defaultDisplayCurrency = langCurrency === storeCurrency ? 'USD' : langCurrency;
  // If USD is also the store currency, pick EUR
  const fallback = storeCurrency === 'USD' ? 'EUR' : defaultDisplayCurrency;

  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => getStoredCurrency() || fallback,
  );

  const setDisplayCurrency = useCallback((code: string) => {
    setDisplayCurrencyState(code);
    try {
      sessionStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    } catch { /* ignore */ }
  }, []);

  const needsConversion = storeCurrency !== displayCurrency;

  const { data: rateData } = useQuery({
    queryKey: ['exchange-rates', storeCurrency],
    queryFn: () => fetchExchangeRates(storeCurrency),
    enabled: needsConversion,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });

  const rate = rateData?.rates?.[displayCurrency] ?? null;

  /**
   * Format a price amount in the store's currency.
   */
  const format = (amount: number): string => {
    return formatPrice(amount, storeCurrency);
  };

  /**
   * Format a converted price in the customer's display currency (approximate).
   * Returns null if conversion is not available or same currency.
   */
  const formatConverted = (amount: number): string | null => {
    if (!needsConversion || rate === null) return null;

    const ZERO_DECIMAL = new Set(['KRW', 'JPY', 'VND', 'CLP', 'ISK']);
    const storeIsZero = ZERO_DECIMAL.has(storeCurrency);
    const targetIsZero = ZERO_DECIMAL.has(displayCurrency);

    const majorValue = storeIsZero ? amount : amount / 100;
    const converted = majorValue * rate;

    const targetMinor = targetIsZero ? Math.round(converted) : Math.round(converted * 100);
    return formatPrice(targetMinor, displayCurrency);
  };

  return {
    storeCurrency,
    displayCurrency,
    setDisplayCurrency,
    needsConversion,
    rate,
    format,
    formatConverted,
  };
}
