-- 001_users_profiles.sql
-- Extends Supabase auth.users with KRUX-specific profile data.

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text not null,
  avatar                text not null default '🌱',
  location              text not null default '',
  krux_balance          integer not null default 50,
  green_score           integer not null default 0,
  streak                integer not null default 0,
  last_scan_date        date,
  total_scans           integer not null default 0,
  co2_saved             numeric(10,3) not null default 0,
  water_saved           numeric(10,3) not null default 0,
  plastic_recycled      numeric(10,3) not null default 0,
  xp                    integer not null default 0,
  level                 smallint not null default 1,
  badges                jsonb not null default '[]',
  streak_freezes        smallint not null default 0,
  challenge_progress    jsonb not null default '{}',
  last_challenge_reset  date,
  last_spin_date        date,
  referral_code         text unique,
  referral_count        integer not null default 0,
  daily_scan_count      smallint not null default 0,
  daily_scan_reset_date date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-set referral code on insert
create or replace function public.generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(replace(gen_random_uuid()::text, '-', '') for 8));
  end if;
  return new;
end;
$$;

create trigger trg_profile_referral_code
  before insert on public.profiles
  for each row execute function public.generate_referral_code();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profile_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Public leaderboard view (read-only, limited columns)
create or replace view public.leaderboard as
  select id, name, avatar, location, green_score, streak, level, total_scans
  from public.profiles
  order by green_score desc;
