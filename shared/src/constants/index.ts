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

export const formatPrice = (cents: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
};
