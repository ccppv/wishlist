export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  google_id?: string;
  onboarding_completed: boolean;
  telegram_user_id?: number;
  telegram_username?: string;
  telegram_notifications_enabled?: boolean;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  password?: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface WishItem {
  id: number;
  title: string;
  description?: string;
  url?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  priority?: 'low' | 'medium' | 'high';
  is_purchased: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WishList {
  id: number;
  title: string;
  description?: string;
  is_public: boolean;
  owner_id: number;
  items: WishItem[];
  created_at: string;
  updated_at?: string;
}

export interface Wishlist {
  id: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  cover_emoji?: string;
  wishlist_type: 'permanent' | 'event';
  event_name?: string;
  event_date?: string;
  visibility: 'public' | 'by_link' | 'friends_only';
  share_token: string;
  owner_id: number;
  items?: Item[];
  items_count?: number;
  created_at: string;
  updated_at?: string;
  is_archived?: boolean;
}

export interface Item {
  id: number;
  wishlist_id: number;
  title: string;
  description?: string;
  image_url?: string;  // Legacy single image (deprecated)
  images?: string[];   // New: array of image URLs
  url?: string;  // Backend uses 'url' field
  link?: string; // Deprecated, use 'url' instead
  price?: number;
  currency: string;
  target_amount?: number;
  collected_amount: number;
  priority: 'low' | 'medium' | 'high';
  is_reserved: boolean;
  is_purchased: boolean;
  reserved_by_name?: string;  // Name of the person who reserved
  contributors?: { name: string; amount: number }[];
  contribution_progress?: number;
  position_order: number;
  created_at: string;
  updated_at?: string;
}
