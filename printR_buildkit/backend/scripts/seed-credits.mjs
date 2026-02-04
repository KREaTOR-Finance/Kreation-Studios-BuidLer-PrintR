import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  return next && !next.startsWith("--") ? next : fallback;
}

const dbPath = argValue("--db", process.env.DATABASE_PATH || "./data/printr.sqlite");
const playerRef = argValue("--player", "tg:demo");
const amountRaw = argValue("--amount", "40");
const amount = Number(amountRaw);
const reason = argValue("--reason", "purchase");
const source = argValue("--source", "admin");

if (!Number.isFinite(amount) || amount === 0) {
  console.error("[seed] invalid amount:", amountRaw);
  process.exit(1);
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS credits_balances (
    player_ref TEXT PRIMARY KEY,
    sessions_balance INTEGER NOT NULL DEFAULT 0,
    updated_at_ms INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credits_ledger (
    id TEXT PRIMARY KEY,
    player_ref TEXT NOT NULL,
    delta_sessions INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    external_ref TEXT,
    idempotency_key TEXT,
    meta_json TEXT,
    created_at_ms INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS webhook_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    received_at_ms INTEGER NOT NULL,
    PRIMARY KEY(provider, event_id)
  );
  CREATE INDEX IF NOT EXISTS idx_ledger_player_time ON credits_ledger(player_ref, created_at_ms DESC);
  CREATE INDEX IF NOT EXISTS idx_ledger_external_ref ON credits_ledger(external_ref);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency ON credits_ledger(player_ref, external_ref, idempotency_key);
`);

const now = Date.now();
const externalRef = `seed_${randomUUID()}`;
const idempotencyKey = `seed_${randomUUID()}`;

const row = db.prepare("SELECT sessions_balance FROM credits_balances WHERE player_ref = ?").get(playerRef);
const prev = row ? Number(row.sessions_balance) : 0;
const next = prev + amount;
if (next < 0) {
  console.error("[seed] would create negative balance, aborting");
  process.exit(1);
}

db.prepare(
  "INSERT INTO credits_ledger (id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(
  randomUUID(),
  playerRef,
  amount,
  reason,
  source,
  externalRef,
  idempotencyKey,
  JSON.stringify({ seed: true }),
  now
);

if (row) {
  db.prepare("UPDATE credits_balances SET sessions_balance = ?, updated_at_ms = ? WHERE player_ref = ?")
    .run(next, now, playerRef);
} else {
  db.prepare("INSERT INTO credits_balances(player_ref, sessions_balance, updated_at_ms) VALUES (?, ?, ?)")
    .run(playerRef, next, now);
}

console.log(`[seed] player=${playerRef} delta=${amount} balance=${next} db=${dbPath}`);
