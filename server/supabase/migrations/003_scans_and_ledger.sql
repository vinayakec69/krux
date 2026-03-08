-- 003_scans_and_ledger.sql
-- Scan sessions (the handshake) and the immutable KRUX ledger.

create type public.session_status_enum as enum (
  'pending_scan', 'scanned', 'pending_drop', 'completed', 'expired', 'fraud'
);

create type public.tx_type_enum as enum (
  'scan_reward', 'challenge_reward', 'spin_reward', 'referral_bonus',
  'purchase', 'streak_freeze', 'daily_login', 'admin_adjustment'
);

-- ── scan_sessions ─────────────────────────────────────────────────────────────

create table if not exists public.scan_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  bin_id            uuid not null references public.bins(id),
  status            session_status_enum not null default 'pending_scan',
  predicted_class   text,
  confidence        numeric(5,4),
  image_hash        text,
  image_url         text,
  gps_lat           numeric(9,6),
  gps_lng           numeric(9,6),
  device_fingerprint text,
  perceptual_hash   text,
  color_histogram   text,
  metadata          jsonb not null default '{}',
  krux_earned       integer not null default 0,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  expires_at        timestamptz not null default (now() + interval '5 minutes')
);

create index idx_scan_sessions_user   on public.scan_sessions(user_id);
create index idx_scan_sessions_bin    on public.scan_sessions(bin_id);
create index idx_scan_sessions_status on public.scan_sessions(status);
create index idx_scan_sessions_phash  on public.scan_sessions(perceptual_hash);

-- RLS
alter table public.scan_sessions enable row level security;

create policy "Users can read own sessions"
  on public.scan_sessions for select
  using (auth.uid() = user_id);

-- Back-fill FK in drop_events
alter table public.drop_events
  add constraint fk_drop_event_session
  foreign key (session_id) references public.scan_sessions(id);

-- ── krux_ledger ───────────────────────────────────────────────────────────────

create table if not exists public.krux_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  amount       integer not null,                  -- positive = credit, negative = debit
  tx_type      tx_type_enum not null,
  reference_id text,                              -- scan_session id, order id, etc.
  balance_after integer not null,
  created_at   timestamptz not null default now()
);

create index idx_ledger_user on public.krux_ledger(user_id);

-- RLS: append-only for users (insert via edge functions), read own entries
alter table public.krux_ledger enable row level security;

create policy "Users can read own ledger"
  on public.krux_ledger for select
  using (auth.uid() = user_id);
