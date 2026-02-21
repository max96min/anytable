// ============ Enums ============

export type SessionStatus = 'OPEN' | 'CLOSED' | 'EXPIRED';
export type ParticipantRole = 'HOST' | 'GUEST';
export type TableStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
export type OrderConfirmMode = 'ANYONE' | 'HOST_ONLY' | 'CONSENSUS';
export type SupportedLanguage = 'en' | 'ko' | 'ja' | 'zh' | 'es';

// ============ Locale Types ============

export interface MenuLocale {
  name: string;
  description?: string;
  cultural_note?: string;
}

export interface CategoryLocale {
  name: string;
}

export interface OptionGroupLocale {
  group_name: string;
}

export interface OptionValueLocale {
  label: string;
}

// ============ API Response Types ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ Store ============

export interface StoreSettings {
  order_confirm_mode: OrderConfirmMode;
  session_ttl_minutes: number;
  allow_additional_orders: boolean;
  tax_rate: number;
  service_charge_rate: number;
  tax_included: boolean;
}

export interface StoreDTO {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  default_language: SupportedLanguage;
  supported_languages: SupportedLanguage[];
  settings: StoreSettings;
}

// ============ Table ============

export interface TableDTO {
  id: string;
  store_id: string;
  table_number: number;
  label?: string;
  status: TableStatus;
  seats: number;
  short_code: string;
  current_session_id?: string | null;
}

// ============ Session ============

export interface SessionDTO {
  id: string;
  store_id: string;
  table_id: string;
  table_number: number;
  status: SessionStatus;
  current_round_no: number;
  participants_count: number;
  created_at: string;
}

export interface ParticipantDTO {
  id: string;
  session_id: string;
  nickname: string;
  role: ParticipantRole;
  joined_at: string;
  avatar_color: string;
}

// ============ Join Session ============

export interface JoinSessionRequest {
  qr_token?: string;
  short_code?: string;
  nickname: string;
  device_fingerprint: string;
  language?: SupportedLanguage;
}

export interface JoinSessionResponse {
  session: SessionDTO;
  participant: ParticipantDTO;
  session_token: string;
  store: StoreDTO;
  cart_id: string;
}

// ============ Category ============

export interface CategoryDTO {
  id: string;
  store_id: string;
  sort_order: number;
  locales: Record<SupportedLanguage, CategoryLocale>;
}

// ============ Menu ============

export interface MenuOptionValue {
  id: string;
  locales: Record<string, OptionValueLocale>;
  price_delta: number;
}

export interface MenuOptionGroup {
  id: string;
  locales: Record<string, OptionGroupLocale>;
  is_required: boolean;
  max_select: number;
  values: MenuOptionValue[];
}

export interface MenuDTO {
  id: string;
  store_id: string;
  category_id: string;
  base_price: number;
  image_url?: string;
  is_sold_out: boolean;
  is_recommended: boolean;
  is_hidden: boolean;
  dietary_tags: string[];
  allergens: string[];
  spiciness_level: number;
  challenge_level: number;
  locales: Record<string, MenuLocale>;
  options: MenuOptionGroup[];
  sort_order: number;
}

// ============ Cart ============

export interface SelectedOption {
  group_id: string;
  value_id: string;
  group_name: string;
  value_label: string;
  price_delta: number;
}

export interface CartItemDTO {
  id: string;
  menu_id: string;
  menu_name: string;
  menu_image?: string;
  participant_id: string;
  participant_nickname: string;
  participant_avatar_color: string;
  quantity: number;
  unit_price: number;
  selected_options: SelectedOption[];
  item_total: number;
}

export interface SharedCartDTO {
  id: string;
  session_id: string;
  version: number;
  items: CartItemDTO[];
  subtotal: number;
  tax: number;
  service_charge: number;
  grand_total: number;
  updated_at: string;
}

export interface CartMutationRequest {
  action: 'ADD' | 'UPDATE' | 'REMOVE';
  cart_version: number;
  participant_id: string;
  item_id?: string;
  menu_id?: string;
  quantity?: number;
  selected_options?: SelectedOption[];
}

// ============ Order ============

export interface OrderItemSnapshot {
  menu_id: string;
  menu_name: string;
  menu_name_secondary?: string;
  quantity: number;
  unit_price: number;
  selected_options: SelectedOption[];
  item_total: number;
  status: OrderStatus;
}

export interface OrderDTO {
  id: string;
  store_id: string;
  table_id: string;
  session_id: string;
  table_number: number;
  round_no: number;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  subtotal: number;
  tax: number;
  service_charge: number;
  grand_total: number;
  placed_at: string;
  updated_at: string;
}

export interface PlaceOrderRequest {
  session_id: string;
  participant_id: string;
  cart_version: number;
  idempotency_key: string;
}

// ============ Admin Auth ============

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  owner: {
    id: string;
    email: string;
    name: string;
    store_id: string;
  };
}

// ============ System Admin ============

export interface SystemAdminDTO {
  id: string;
  email: string;
  name: string;
}

export interface SystemLoginRequest {
  email: string;
  password: string;
}

export interface SystemLoginResponse {
  access_token: string;
  refresh_token: string;
  admin: SystemAdminDTO;
}

export interface SystemStoreDTO {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  owner: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
}

export interface SystemStoreDetailDTO extends SystemStoreDTO {
  address?: string | null;
  phone?: string | null;
  default_language: string;
  supported_languages: string[];
  table_count: number;
  menu_count: number;
  orders_today: number;
  revenue_today: number;
}

export interface SystemOwnerDTO {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  stores: { id: string; name: string; is_active: boolean }[];
}

export interface PlatformStatsDTO {
  total_stores: number;
  active_stores: number;
  total_owners: number;
  orders_today: number;
  revenue_today: number;
  recent_orders: RecentOrderDTO[];
}

export interface RecentOrderDTO {
  id: string;
  store_name: string;
  table_number: number;
  status: string;
  grand_total: number;
  placed_at: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface CreateOwnerStoreRequest {
  email: string;
  password: string;
  name: string;
  store_name: string;
}

// ============ Socket Events ============

export interface SocketEvents {
  CART_UPDATED: { cart: SharedCartDTO };
  ORDER_PLACED: { order: OrderDTO };
  ORDER_STATUS_CHANGED: { order_id: string; status: OrderStatus; items?: OrderItemSnapshot[] };
  SESSION_CLOSED: { session_id: string };
  PARTICIPANT_JOINED: { participant: ParticipantDTO };
  PARTICIPANT_LEFT: { participant_id: string };
  CART_EDITING: { participant_id: string; nickname: string; is_editing: boolean };
}
