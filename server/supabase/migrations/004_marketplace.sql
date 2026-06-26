-- 004_marketplace.sql
-- Products catalog and orders.

create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  description          text not null default '',
  price                integer not null,                    -- in KRUX coins
  image_url            text not null default '',
  category             text not null default 'general',
  stock                integer not null default 0,
  affiliate_commission numeric(5,2) not null default 0,
  features             jsonb not null default '[]',
  rating               numeric(3,2) not null default 0,
  reviews              integer not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

-- RLS: anyone can read active products
alter table public.products enable row level security;

create policy "Anyone can read active products"
  on public.products for select
  using (active = true);

-- ── orders ────────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  products      jsonb not null,                            -- [{product_id, quantity}]
  total         integer not null,
  delivery_info jsonb not null default '{}',
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create index idx_orders_user on public.orders(user_id);

-- RLS
alter table public.orders enable row level security;

create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);
