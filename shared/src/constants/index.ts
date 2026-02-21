export const SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'zh', 'es'] as const;

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
};

export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  ko: '🇰🇷',
  ja: '🇯🇵',
  zh: '🇨🇳',
  es: '🇪🇸',
};

export const ORDER_STATUS_FLOW = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] as const;

export const ALLERGEN_LIST = [
  'peanuts', 'dairy', 'gluten', 'shellfish', 'eggs', 'soy',
  'tree_nuts', 'fish', 'wheat', 'sesame',
] as const;

export const DIETARY_TAGS = [
  'vegan', 'vegetarian', 'halal', 'kosher', 'pork_free', 'gluten_free',
] as const;

export const ALLERGEN_ICONS: Record<string, string> = {
  peanuts: '🥜',
  dairy: '🥛',
  gluten: '🌾',
  shellfish: '🦐',
  eggs: '🥚',
  soy: '🫘',
  tree_nuts: '🌰',
  fish: '🐟',
  wheat: '🌾',
  sesame: '🫘',
};

export const DEFAULT_SESSION_TTL_MINUTES = 180;
export const DEFAULT_TAX_RATE = 0.08;
export const DEFAULT_SERVICE_CHARGE_RATE = 0.10;

export const AVATAR_COLORS = [
  '#e68119', '#3b82f6', '#10b981', '#8b5cf6',
  '#ef4444', '#f59e0b', '#06b6d4', '#ec4899',
];

// Currencies with 0 minor units (no cents/subunits)
const ZERO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND', 'CLP', 'ISK', 'UGX', 'RWF']);

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
  KRW: 'ko-KR', JPY: 'ja-JP', CNY: 'zh-CN',
  THB: 'th-TH', VND: 'vi-VN', TWD: 'zh-TW',
};

export const SUPPORTED_CURRENCIES = [
  { code: 'KRW', label: '₩ KRW (Korean Won)' },
  { code: 'USD', label: '$ USD (US Dollar)' },
  { code: 'JPY', label: '¥ JPY (Japanese Yen)' },
  { code: 'CNY', label: '¥ CNY (Chinese Yuan)' },
  { code: 'EUR', label: '€ EUR (Euro)' },
  { code: 'GBP', label: '£ GBP (British Pound)' },
  { code: 'THB', label: '฿ THB (Thai Baht)' },
  { code: 'TWD', label: 'NT$ TWD (Taiwan Dollar)' },
  { code: 'VND', label: '₫ VND (Vietnamese Dong)' },
] as const;

export const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  en: 'USD', ko: 'KRW', ja: 'JPY', zh: 'CNY', es: 'EUR',
};

export const formatPrice = (amount: number, currency = 'KRW'): string => {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
  const value = isZeroDecimal ? amount : amount / 100;
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(value);
};
