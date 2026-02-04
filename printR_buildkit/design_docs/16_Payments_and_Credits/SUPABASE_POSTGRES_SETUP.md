# Supabase Postgres Setup (Credits + Stripe Idempotency)

## What we use Supabase for (authoritative)
- Credits balances + ledger (sessions)
- Stripe webhook idempotency table
- Profiles (Telegram ID primary)

## Apply schema
Run the migration SQL in Supabase:
- `printR_buildkit/backend/sql/migrations/002_supabase_postgres.sql`

## Connection string
In Supabase project settings (Database), copy the Postgres connection string and set:
- `DATABASE_URL=...`

## Backend store selection
Backend should use:
- PostgresCreditsStore when `DATABASE_URL` is set
- fallback to SQLiteCreditsStore for local dev when only `DATABASE_PATH` is set

## Minimum tables
- profiles
- credits_balances
- credits_ledger
- stripe_webhook_events
