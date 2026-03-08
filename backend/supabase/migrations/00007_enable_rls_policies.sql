-- Migration: 00007_enable_rls_policies.sql
-- Enable Row-Level Security on all tables and define access policies

-- ── profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-sensitive fields (name, avatar, location)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role bypass (for edge functions that update balances)
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all"
  ON public.profiles
  USING (auth.role() = 'service_role');

-- ── scans ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Users can read their own scans
DROP POLICY IF EXISTS "scans_select_own" ON public.scans;
CREATE POLICY "scans_select_own"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert scans (via edge function)
DROP POLICY IF EXISTS "scans_insert_service_role" ON public.scans;
CREATE POLICY "scans_insert_service_role"
  ON public.scans FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── coin_transactions ─────────────────────────────────────────────────────────
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
DROP POLICY IF EXISTS "coin_transactions_select_own" ON public.coin_transactions;
CREATE POLICY "coin_transactions_select_own"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert transactions
DROP POLICY IF EXISTS "coin_transactions_insert_service_role" ON public.coin_transactions;
CREATE POLICY "coin_transactions_insert_service_role"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── products ──────────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active products
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role') AND is_active = TRUE);

-- Only service_role can modify products
DROP POLICY IF EXISTS "products_all_service_role" ON public.products;
CREATE POLICY "products_all_service_role"
  ON public.products
  USING (auth.role() = 'service_role');

-- ── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can create orders
DROP POLICY IF EXISTS "orders_insert_service_role" ON public.orders;
CREATE POLICY "orders_insert_service_role"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── order_items ───────────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users can read items belonging to their own orders
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Only service_role can insert order items
DROP POLICY IF EXISTS "order_items_insert_service_role" ON public.order_items;
CREATE POLICY "order_items_insert_service_role"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── challenge_definitions & badge_definitions (read-only for all authenticated) ─
ALTER TABLE public.challenge_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_definitions_select_all" ON public.challenge_definitions;
CREATE POLICY "challenge_definitions_select_all"
  ON public.challenge_definitions FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badge_definitions_select_all" ON public.badge_definitions;
CREATE POLICY "badge_definitions_select_all"
  ON public.badge_definitions FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

-- ── leaderboard_view (read-only for authenticated) ───────────────────────────
-- Views inherit RLS from their underlying tables, so no separate policy needed.
