-- Minimal schema (Postgres or SQLite compatible-ish)
-- You may adapt types based on DB.

CREATE TABLE IF NOT EXISTS players (
  player_ref TEXT PRIMARY KEY,
  telegram_user_id TEXT,
  wallet_pubkey TEXT,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_balances (
  player_ref TEXT PRIMARY KEY REFERENCES players(player_ref),
  sessions_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  player_ref TEXT NOT NULL REFERENCES players(player_ref),
  delta_sessions INTEGER NOT NULL,
  reason TEXT NOT NULL,          -- "purchase", "consume", "refund", "adjustment"
  source TEXT NOT NULL,          -- "stripe", "usdc", "system", "admin"
  external_ref TEXT,             -- stripe event id, checkout session id, tx sig, etc.
  meta_json TEXT,                -- optional JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS credit_ledger_player_ref_idx ON credit_ledger(player_ref);
CREATE INDEX IF NOT EXISTS credit_ledger_created_at_idx ON credit_ledger(created_at);
