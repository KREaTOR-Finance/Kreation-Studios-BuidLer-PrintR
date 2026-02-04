-- PrintR Credits DB (SQLite)
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS credits_balances (
  player_ref TEXT PRIMARY KEY,
  sessions_balance INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credits_ledger (
  id TEXT PRIMARY KEY,
  player_ref TEXT NOT NULL,
  delta_sessions INTEGER NOT NULL,
  reason TEXT NOT NULL,          -- purchase|consume|refund|adjustment
  source TEXT NOT NULL,          -- stripe|usdc|system|admin
  external_ref TEXT,             -- stripe session id, sessionId, etc.
  idempotency_key TEXT,
  meta_json TEXT,                -- JSON string
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_player_time ON credits_ledger(player_ref, created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_external_ref ON credits_ledger(external_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency ON credits_ledger(player_ref, external_ref, idempotency_key);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider TEXT NOT NULL,        -- stripe
  event_id TEXT NOT NULL,
  received_at_ms INTEGER NOT NULL,
  PRIMARY KEY(provider, event_id)
);
