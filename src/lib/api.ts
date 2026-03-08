import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Json,
  ApiResponse,
  Profile,
  ProfileUpdate,
  Scan,
  CoinTransaction,
  Product,
  Order,
  LeaderboardEntry,
  ScanSubmitPayload,
  ScanSubmitResult,
  CreateOrderPayload,
  CreateOrderResult,
} from './database.types';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Helper to get a loosely-typed query builder for tables that need updates.
// This works around TypeScript strict inference issues with supabase-js v2 update().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueryBuilder = any;

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ user_id: string }>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { data: null, error: error.message };
    return { data: { user_id: data.user.id }, error: null };
  },

  async signup(
    email: string,
    password: string,
    name: string,
    location: string
  ): Promise<ApiResponse<{ user_id: string }>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, location },
      },
    });
    if (error) return { data: null, error: error.message };
    if (!data.user) return { data: null, error: 'Signup failed' };
    return { data: { user_id: data.user.id }, error: null };
  },

  async logout(): Promise<ApiResponse<null>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }
    const { error } = await supabase.auth.signOut();
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },

  async getSession(): Promise<ApiResponse<Session>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) return { data: null, error: error.message };
    if (!data.session) return { data: null, error: null };
    return { data: data.session, error: null };
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ── Profile API ───────────────────────────────────────────────────────────────

export const profileApi = {
  async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async updateProfile(
    userId: string,
    updates: ProfileUpdate
  ): Promise<ApiResponse<Profile>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const payload = { ...updates, updated_at: new Date().toISOString() };
    // Using `as AnyQueryBuilder` to work around supabase-js v2 strict update() inference
    const qb = supabase.from('profiles') as AnyQueryBuilder;
    const { data, error } = await qb.update(payload).eq('id', userId).select().single() as {
      data: Profile | null;
      error: { message: string } | null;
    };
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },
};

// ── Scan API ──────────────────────────────────────────────────────────────────

export const scanApi = {
  /**
   * Submit a scan via the server-side edge function for validation and coin credit.
   * The edge function handles duplicate checking, rate limiting, and fraud detection.
   */
  async submitScan(
    payload: ScanSubmitPayload
  ): Promise<ApiResponse<ScanSubmitResult>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.functions.invoke<ScanSubmitResult>(
      'validate-scan',
      { body: payload }
    );
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'No response from server' };
    return { data, error: null };
  },

  async getScanHistory(userId: string): Promise<ApiResponse<Scan[]>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },
};

// ── Coin API ──────────────────────────────────────────────────────────────────

export const coinApi = {
  async getBalance(userId: string): Promise<ApiResponse<number>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('krux_balance')
      .eq('id', userId)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: (data as { krux_balance: number }).krux_balance, error: null };
  },

  async getTransactionHistory(
    userId: string
  ): Promise<ApiResponse<CoinTransaction[]>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },
};

// ── Marketplace API ───────────────────────────────────────────────────────────

export const marketplaceApi = {
  async getProducts(): Promise<ApiResponse<Product[]>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },

  async createOrder(
    payload: CreateOrderPayload
  ): Promise<ApiResponse<CreateOrderResult>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.functions.invoke<CreateOrderResult>(
      'credit-coins',
      { body: { action: 'purchase', ...payload } }
    );
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'No response from server' };
    return { data, error: null };
  },

  async getOrders(userId: string): Promise<ApiResponse<Order[]>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  },
};

// ── Leaderboard API ───────────────────────────────────────────────────────────

export const leaderboardApi = {
  async getLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase.functions.invoke<LeaderboardEntry[]>(
      'leaderboard'
    );
    if (error) {
      // Fallback: query the view directly
      const { data: viewData, error: viewError } = await supabase
        .from('leaderboard_view')
        .select('*')
        .limit(50);
      if (viewError) return { data: null, error: viewError.message };
      return { data: viewData ?? [], error: null };
    }
    return { data: data ?? [], error: null };
  },
};

// ── Challenge API ─────────────────────────────────────────────────────────────

export const challengeApi = {
  async getChallenges(userId: string): Promise<ApiResponse<{
    challenge_progress: Record<string, number>;
    last_challenge_reset: string | null;
  }>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('challenge_progress, last_challenge_reset')
      .eq('id', userId)
      .single();
    if (error) return { data: null, error: error.message };
    const row = data as { challenge_progress: Json; last_challenge_reset: string | null };
    return {
      data: {
        challenge_progress: (row.challenge_progress as Record<string, number>) ?? {},
        last_challenge_reset: row.last_challenge_reset,
      },
      error: null,
    };
  },

  async updateProgress(
    userId: string,
    challengeProgress: Record<string, number>,
    lastChallengeReset: string | null
  ): Promise<ApiResponse<null>> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    const payload = {
      challenge_progress: challengeProgress as Json,
      last_challenge_reset: lastChallengeReset,
      updated_at: new Date().toISOString(),
    };
    // Using `as AnyQueryBuilder` to work around supabase-js v2 strict update() inference
    const qb = supabase.from('profiles') as AnyQueryBuilder;
    const { error } = await qb.update(payload).eq('id', userId) as {
      error: { message: string } | null;
    };
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  },
};
