-- Migration: 00003_create_coin_transactions.sql
-- Double-entry ledger for all KRUX coin movements

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,           -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN (
    'scan_reward',
    'purchase',
    'referral_bonus',
    'spin_reward',
    'challenge_reward',
    'streak_bonus',
    'admin_adjustment'
  )),
  reference_id UUID,                 -- scan_id, order_id, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user transaction lookups
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON public.coin_transactions(created_at);
