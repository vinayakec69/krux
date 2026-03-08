-- 006_fraud_logs.sql
-- Fraud detection audit log.

create table if not exists public.fraud_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.scan_sessions(id),
  fraud_type  text not null,
  confidence  numeric(5,4) not null default 0,
  details     jsonb not null default '{}',
  action_taken text not null default 'flagged',
  created_at  timestamptz not null default now()
);

create index idx_fraud_logs_user    on public.fraud_logs(user_id);
create index idx_fraud_logs_created on public.fraud_logs(created_at);

-- RLS: users cannot read fraud logs (admin only)
alter table public.fraud_logs enable row level security;

create policy "No direct user access to fraud_logs"
  on public.fraud_logs
  using (false);

-- Auto-ban function: ban users with > 5 fraud flags per week
create or replace function public.check_auto_ban(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  weekly_flags integer;
begin
  select count(*) into weekly_flags
  from public.fraud_logs
  where user_id = p_user_id
    and created_at >= now() - interval '7 days';

  if weekly_flags >= 5 then
    -- Disable the user's auth account
    update auth.users set banned_until = 'infinity' where id = p_user_id;
    insert into public.fraud_logs (user_id, fraud_type, details, action_taken)
    values (p_user_id, 'auto_ban', jsonb_build_object('weekly_flags', weekly_flags), 'banned');
  end if;
end;
$$;
