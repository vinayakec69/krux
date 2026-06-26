-- 002_bins_and_drops.sql
-- Physical bin registry and IoT drop events.

create type public.bin_type_enum as enum ('PET', 'HDPE', 'OTHER');
create type public.bin_status_enum as enum ('active', 'maintenance', 'offline');

create table if not exists public.bins (
  id               uuid primary key default gen_random_uuid(),
  bin_id           text unique not null,   -- physical QR / NFC identifier
  location_lat     numeric(9,6),
  location_lng     numeric(9,6),
  location_name    text not null default '',
  bin_type         bin_type_enum not null default 'OTHER',
  status           bin_status_enum not null default 'active',
  last_heartbeat   timestamptz,
  firmware_version text,
  fill_level       smallint default 0 check (fill_level between 0 and 100),
  created_at       timestamptz not null default now()
);

-- RLS: users can only read bins
alter table public.bins enable row level security;

create policy "Anyone can read active bins"
  on public.bins for select
  using (status = 'active');

-- drop_events — raw IoT payloads from ESP32 sensors

create table if not exists public.drop_events (
  id                  uuid primary key default gen_random_uuid(),
  bin_id              uuid not null references public.bins(id),
  session_id          uuid,                    -- FK added in migration 003
  delta_weight        numeric(6,2),
  ir_sensor_triggered boolean not null default false,
  raw_payload         jsonb not null default '{}',
  matched             boolean not null default false,
  created_at          timestamptz not null default now()
);

-- RLS: only service-role (edge functions) can insert/update drop_events
alter table public.drop_events enable row level security;

create policy "Service role manages drop_events"
  on public.drop_events
  using (false);   -- no direct user access; edge functions use service key
