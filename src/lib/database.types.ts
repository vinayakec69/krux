// Auto-generated TypeScript types for the KRUX Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar: string;
          location: string;
          krux_balance: number;
          green_score: number;
          streak: number;
          last_scan_date: string | null;
          total_scans: number;
          co2_saved: number;
          water_saved: number;
          plastic_recycled: number;
          xp: number;
          level: number;
          streak_freezes: number;
          last_spin_date: string | null;
          referral_code: string | null;
          referral_count: number;
          badges: string[];
          challenge_progress: Json;
          last_challenge_reset: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar?: string;
          location?: string;
          krux_balance?: number;
          green_score?: number;
          streak?: number;
          last_scan_date?: string | null;
          total_scans?: number;
          co2_saved?: number;
          water_saved?: number;
          plastic_recycled?: number;
          xp?: number;
          level?: number;
          streak_freezes?: number;
          last_spin_date?: string | null;
          referral_code?: string | null;
          referral_count?: number;
          badges?: string[];
          challenge_progress?: Json;
          last_challenge_reset?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar?: string;
          location?: string;
          krux_balance?: number;
          green_score?: number;
          streak?: number;
          last_scan_date?: string | null;
          total_scans?: number;
          co2_saved?: number;
          water_saved?: number;
          plastic_recycled?: number;
          xp?: number;
          level?: number;
          streak_freezes?: number;
          last_spin_date?: string | null;
          referral_code?: string | null;
          referral_count?: number;
          badges?: string[];
          challenge_progress?: Json;
          last_challenge_reset?: string | null;
          updated_at?: string;
        };
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          plastic_type: string;
          confidence: number;
          image_hash: string;
          color_histogram: string | null;
          device_id: string;
          gps_lat: number | null;
          gps_lng: number | null;
          krux_earned: number;
          verified: boolean;
          fraud_flags: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plastic_type: string;
          confidence: number;
          image_hash: string;
          color_histogram?: string | null;
          device_id: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          krux_earned?: number;
          verified?: boolean;
          fraud_flags?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plastic_type?: string;
          confidence?: number;
          image_hash?: string;
          color_histogram?: string | null;
          device_id?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          krux_earned?: number;
          verified?: boolean;
          fraud_flags?: Json;
        };
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          tx_type: TxType;
          reference_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          tx_type: TxType;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          balance_after?: number;
          tx_type?: TxType;
          reference_id?: string | null;
          metadata?: Json;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image: string | null;
          category: string | null;
          stock: number;
          affiliate_commission: number;
          features: string[];
          rating: number;
          reviews: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          image?: string | null;
          category?: string | null;
          stock?: number;
          affiliate_commission?: number;
          features?: string[];
          rating?: number;
          reviews?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image?: string | null;
          category?: string | null;
          stock?: number;
          affiliate_commission?: number;
          features?: string[];
          rating?: number;
          reviews?: number;
          is_active?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          total: number;
          status: OrderStatus;
          delivery_info: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total: number;
          status?: OrderStatus;
          delivery_info: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total?: number;
          status?: OrderStatus;
          delivery_info?: Json;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_purchase: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          price_at_purchase: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          price_at_purchase?: number;
        };
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          id: string;
          name: string;
          avatar: string;
          green_score: number;
          location: string;
          streak: number;
          rank: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      tx_type: TxType;
      order_status: OrderStatus;
    };
  };
}

export type TxType =
  | 'scan_reward'
  | 'purchase'
  | 'referral_bonus'
  | 'spin_reward'
  | 'challenge_reward'
  | 'streak_bonus'
  | 'admin_adjustment';

export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PlasticType = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER';

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Scan = Database['public']['Tables']['scans']['Row'];
export type ScanInsert = Database['public']['Tables']['scans']['Insert'];

export type CoinTransaction = Database['public']['Tables']['coin_transactions']['Row'];
export type CoinTransactionInsert = Database['public']['Tables']['coin_transactions']['Insert'];

export type Product = Database['public']['Tables']['products']['Row'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export type LeaderboardEntry = Database['public']['Views']['leaderboard_view']['Row'];

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ScanSubmitPayload {
  image_hash: string;
  color_histogram?: string;
  device_id: string;
  gps_lat?: number;
  gps_lng?: number;
  plastic_type: PlasticType;
  confidence: number;
}

export interface ScanSubmitResult {
  success: boolean;
  coins_earned: number;
  new_balance: number;
  scan_id: string;
  message?: string;
}

export interface CreditCoinsPayload {
  user_id: string;
  amount: number;
  tx_type: TxType;
  reference_id?: string;
  metadata?: Json;
}

export interface CreditCoinsResult {
  success: boolean;
  new_balance: number;
  transaction_id: string;
}

export interface CreateOrderPayload {
  items: { product_id: string; quantity: number }[];
  delivery_info: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface CreateOrderResult {
  success: boolean;
  order_id: string;
  new_balance: number;
}
