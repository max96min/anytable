interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, ExchangeRates>();

export async function getExchangeRates(
  baseCurrency: string,
): Promise<Record<string, number>> {
  const cached = cache.get(baseCurrency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseCurrency)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`Exchange rate API returned ${res.status}`);
    }
    const data = (await res.json()) as { base: string; rates: Record<string, number> };

    const entry: ExchangeRates = {
      base: baseCurrency,
      rates: data.rates,
      fetchedAt: Date.now(),
    };
    cache.set(baseCurrency, entry);
    return data.rates;
  } catch (err) {
    // If we have stale cache, return it rather than failing
    if (cached) {
      return cached.rates;
    }
    console.error('[ExchangeRate] Failed to fetch rates:', err);
    return {};
  }
}
