-- Developer leads table for Kreation Studios Games
-- Compatible with Supabase Postgres.

create table if not exists public.developer_leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  studio text,
  game_title text not null,
  game_link text,
  pitch text not null,
  stack text,
  socials text,
  notes text,
  player_ref text,
  ip text,
  user_agent text
);

create index if not exists developer_leads_created_at_idx on public.developer_leads (created_at desc);
create index if not exists developer_leads_email_idx on public.developer_leads (email);
