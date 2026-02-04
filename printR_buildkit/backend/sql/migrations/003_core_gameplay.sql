-- PrintR Core Gameplay Persistence (Postgres/Supabase)

create table if not exists player_profiles (
  player_ref text primary key,
  points integer not null default 0,
  streak integer not null default 0,
  total_rounds integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists round_history (
  round_id text primary key,
  player_ref text not null,
  session_id text,
  tier text not null,
  direction text not null,
  status text not null,
  points_delta integer not null,
  streak_delta integer not null,
  randomness_hex text not null,
  z_value double precision not null,
  request_id text,
  nonce text not null,
  signature text not null,
  proof_ref text,
  proof_json jsonb,
  requested_at timestamptz not null,
  fulfilled_at timestamptz not null
);

create index if not exists idx_rounds_player_time on round_history(player_ref, fulfilled_at desc);
create unique index if not exists idx_rounds_player_nonce on round_history(player_ref, nonce);

create table if not exists prize_claims (
  id uuid primary key,
  player_ref text not null,
  prize_id text not null,
  cost_points integer not null,
  status text not null default 'PENDING',
  meta_json jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_prize_claims_player_prize on prize_claims(player_ref, prize_id);

create table if not exists receipts (
  id uuid primary key,
  player_ref text not null,
  delta_sessions integer not null default 0,
  delta_points integer not null default 0,
  reason text not null,
  source text not null,
  external_ref text,
  meta_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_receipts_player_time on receipts(player_ref, created_at desc);

create table if not exists analytics_events (
  id uuid primary key,
  player_ref text not null,
  event text not null,
  session_id text,
  meta_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_player_time on analytics_events(player_ref, created_at desc);
