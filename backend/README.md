# KRUX Backend — Supabase Infrastructure

This directory contains all backend infrastructure for the KRUX app, built on [Supabase](https://supabase.com).

## Architecture

```
backend/
├── supabase/
│   ├── config.toml                  # Supabase local dev configuration
│   └── migrations/
│       ├── 00001_create_users_profile.sql    # profiles table + auth trigger
│       ├── 00002_create_scans.sql             # scans table + indexes
│       ├── 00003_create_coin_transactions.sql # double-entry ledger
│       ├── 00004_create_products_orders.sql   # products, orders, order_items
│       ├── 00005_create_leaderboard_view.sql  # leaderboard SQL view
│       ├── 00006_create_challenges_badges.sql # challenge & badge definitions
│       └── 00007_enable_rls_policies.sql      # Row-Level Security policies
├── functions/
│   ├── validate-scan/index.ts        # Server-side scan validation + coin credit
│   ├── credit-coins/index.ts         # Generic atomic coin credit/debit
│   └── leaderboard/index.ts          # Leaderboard rankings computation
└── README.md                          # This file
```

## High-Level Architecture

```
React App (Vercel)
      │
      │ HTTPS
      ▼
Supabase Auth  ──────►  profiles table  (RLS: user can read/update own row)
      │
      │ JWT
      ▼
Edge Functions (Deno)
  ├── validate-scan   ──► scans + coin_transactions + profiles (service_role)
  ├── credit-coins    ──► coin_transactions + orders + profiles (service_role)
  └── leaderboard     ──► profiles (read, service_role)
      │
      ▼
PostgreSQL (Supabase)
  ├── profiles          (balance, stats — only service_role can mutate)
  ├── scans             (insert-only via edge function)
  ├── coin_transactions (double-entry ledger, insert-only via edge function)
  ├── products          (read-only for users)
  ├── orders            (insert-only via edge function)
  ├── order_items       (insert-only via edge function)
  ├── challenge_definitions (read-only reference table)
  ├── badge_definitions     (read-only reference table)
  └── leaderboard_view      (SQL view, read-only)
```

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase`
- A [Supabase account](https://app.supabase.com) and project

## Local Development Setup

### 1. Install the Supabase CLI

```bash
npm install -g supabase
```

### 2. Start the local Supabase stack

```bash
# From the repo root
cd backend
supabase start
```

This starts a local Postgres instance, Auth server, and Edge Function runner.

### 3. Run migrations

```bash
supabase db push
```

Or apply migrations manually:

```bash
supabase migration up
```

### 4. Set environment variables

Copy `.env.example` to `.env.local` in the repo root:

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key. These are visible in your Supabase project dashboard under **Settings → API**.

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit `.env.local` or any file containing real keys.**

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy validate-scan --project-ref your-project-id
supabase functions deploy credit-coins  --project-ref your-project-id
supabase functions deploy leaderboard   --project-ref your-project-id
```

Set the required secrets for the functions:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref your-project-id
```

## Environment Variable Reference

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Public anon key from Supabase dashboard |
| `ALLOWED_ORIGIN` | CORS allowed origin for edge functions (e.g. `http://localhost:5173` for dev, `https://krux-dimd.vercel.app` for prod) |

The following are set automatically by Supabase in Edge Functions — do not commit them:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Injected automatically by Supabase runtime |
| `SUPABASE_ANON_KEY` | Injected automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | Must be set as a secret via `supabase secrets set` |

## Security Model

- **RLS is enabled on every table.** Users can only read their own data.
- **Coin balances can only be modified by Edge Functions** running as `service_role`. The client-side app can never directly increment a balance.
- **Scans are insert-only via `validate-scan` edge function**, which enforces confidence thresholds, duplicate detection, and rate limits (50 scans/day/user).
- **Orders are created only via `credit-coins` edge function**, which validates sufficient balance before deducting.
- **All inputs are validated server-side** in the Edge Functions before any DB write.

## Graceful Fallback

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the app automatically falls back to the legacy `localStorage`-based mode. This ensures the app continues to function during development without a Supabase project configured.
