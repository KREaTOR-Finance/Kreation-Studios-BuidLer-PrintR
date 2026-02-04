-- Supabase Postgres migration for PrintR Credits Ledger (authoritative)
-- Apply in Supabase SQL editor or via migration tool.
-- Notes:
-- - Uses bigint for counters, text for ids.
-- - Idempotency table for Stripe webhooks included.

create table if not exists profiles (
  id bigserial primary key,
  telegram_id text unique not null,
  wallet_pubkey text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credits_balances (
  telegram_id text primary key references profiles(telegram_id) on delete cascade,
  sessions_balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists credits_ledger (
  id bigserial primary key,
  telegram_id text not null references profiles(telegram_id) on delete cascade,
  delta_sessions bigint not null,
  reason text not null, -- 'stripe_purchase' | 'usdc_purchase' | 'session_join' | 'admin_adjust' | etc
  source_ref text,      -- e.g. stripe session id, stripe event id, solana tx sig
  idempotency_key text, -- client idempotency key (optional)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credits_ledger_telegram_id on credits_ledger(telegram_id);
create index if not exists idx_credits_ledger_created_at on credits_ledger(created_at);

create table if not exists stripe_webhook_events (
  id bigserial primary key,
  stripe_event_id text unique not null,
  processed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Helpful trigger to keep updated_at fresh (optional)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists trg_balances_updated_at on credits_balances;
create trigger trg_balances_updated_at
before update on credits_balances
for each row execute function set_updated_at();
