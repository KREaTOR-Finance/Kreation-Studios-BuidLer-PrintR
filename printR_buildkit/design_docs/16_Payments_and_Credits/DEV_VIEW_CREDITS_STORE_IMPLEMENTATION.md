# Dev View — Credits Store Implementation (SQLite, Authoritative)

This document describes the **database-ledger credits** implementation used by PrintR.

## Goals
- Credits are **session credits** (integer sessions).
- Credits are **non-transferable** and **non-redeemable**.
- Balance is authoritative server-side.
- All balance changes are recorded in an **append-only ledger**.
- Purchases are idempotent (Stripe webhook replays must not double-credit).

## Identity
Credits are bound to `playerRef`:
- Primary: `tg:<telegram_user_id>`
- Optional: wallet pubkey is linked later for governance airdrops, not for credits.

## Tables (SQLite)
### `credits_balances`
- `player_ref` (PK)
- `balance_sessions` (int)
- `updated_at_ms` (epoch ms)

### `credits_ledger` (append-only)
- `id` (uuid PK)
- `player_ref`
- `delta_sessions` (positive/negative)
- `reason` = purchase | consume | refund | adjustment
- `source` = stripe | usdc | system | admin
- `external_ref` (stripe session id, sessionId, etc.)
- `meta_json` (json string)
- `created_at_ms`

Indexes:
- `(player_ref, created_at_ms DESC)` for history pages
- `(external_ref)` for reconciliation

### `webhook_events`
Idempotency gate for webhook processing.
- `(provider, event_id)` as PK

## Invariants
- `balance_sessions` MUST equal sum of ledger deltas for that `player_ref`.
- `balance_sessions` MUST NOT go below 0 (enforced at consume boundary).
- Ledger is append-only. Never update ledger rows.

## Consumption rules
- Consume 1 session credit on `JOIN` when phase is:
  - LIVE
  - FINAL_COMMIT_WARNING
- In CLOSING:
  - join becomes **spectator**
  - consume **0**
- If session fails to start after successful join:
  - emit a `refund` ledger entry (+1) with externalRef=sessionId and meta containing the reason

## Stripe webhook
- Verify signature with `STRIPE_WEBHOOK_SECRET`
- Only credit on `checkout.session.completed`
- Read `playerRef` and `bundle` from `session.metadata`
- Idempotency:
  - store `(stripe,event.id)` in `webhook_events`
  - if duplicate, ACK without adding credits

## Migration
Migrations live in:
- `backend/sql/migrations/001_init.sql`

For MVP, `SqliteCreditsStore.migrate()` creates tables if missing.


## Supabase Postgres (Production Path)
- Use `PostgresCreditsStore` (`backend/src/credits/postgresCreditsStore.ts`).
- Apply schema via `sql/migrations/002_supabase_postgres.sql`.
- Use `DATABASE_URL` for connection.
