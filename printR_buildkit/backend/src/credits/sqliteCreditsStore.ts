import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { CreditLedgerEntry, CreditsStore } from "./store";

/**
 * SQLite-backed credits store.
 * - balances are authoritative
 * - ledger is append-only
 * - consumption supports idempotency via externalRef+idempotencyKey in meta
 */
export class SqliteCreditsStore implements CreditsStore {
  private db: Database.Database;

  constructor(dbPath: string){
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  migrate(){
    // This store expects migrations to have been executed.
    // For convenience in MVP, we include a minimal safety check.
    this.db.exec(`
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
  }

  async getBalance(playerRef: string): Promise<number> {
    const row = this.db.prepare("SELECT sessions_balance FROM credits_balances WHERE player_ref = ?").get(playerRef) as any;
    return row ? Number(row.sessions_balance) : 0;
  }

  async addLedger(entry: Omit<CreditLedgerEntry, "id" | "createdAt">): Promise<CreditLedgerEntry> {
    const now = Date.now();
    const full: CreditLedgerEntry = {
      id: randomUUID(),
      createdAt: now,
      ...entry,
    };

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO credits_ledger
          (id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at_ms)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        full.id,
        full.playerRef,
        full.deltaSessions,
        full.reason,
        full.source,
        full.externalRef ?? null,
        full.idempotencyKey ?? null,
        full.meta ? JSON.stringify(full.meta) : null,
        full.createdAt
      );

      const prev = this.db.prepare("SELECT sessions_balance FROM credits_balances WHERE player_ref = ?").get(full.playerRef) as any;
      const prevBal = prev ? Number(prev.sessions_balance) : 0;
      const nextBal = prevBal + full.deltaSessions;
      if (nextBal < 0) throw new Error("INSUFFICIENT_SESSIONS");

      if (prev){
        this.db.prepare("UPDATE credits_balances SET sessions_balance = ?, updated_at_ms = ? WHERE player_ref = ?")
          .run(nextBal, now, full.playerRef);
      } else {
        this.db.prepare("INSERT INTO credits_balances(player_ref, sessions_balance, updated_at_ms) VALUES (?, ?, ?)")
          .run(full.playerRef, nextBal, now);
      }
    });

    tx();
    return full;
  }

  async listLedger(playerRef: string, limit = 100): Promise<CreditLedgerEntry[]> {
    const rows = this.db.prepare(`
      SELECT id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at_ms
      FROM credits_ledger
      WHERE player_ref = ?
      ORDER BY created_at_ms DESC
      LIMIT ?
    `).all(playerRef, limit) as any[];

    return rows.map(row => ({
      id: String(row.id),
      playerRef: String(row.player_ref),
      deltaSessions: Number(row.delta_sessions),
      reason: row.reason,
      source: row.source,
      externalRef: row.external_ref ?? null,
      idempotencyKey: row.idempotency_key ?? null,
      meta: row.meta_json ? JSON.parse(row.meta_json) : null,
      createdAt: Number(row.created_at_ms)
    }));
  }

  async consumeOneSession(playerRef: string, sessionId: string, idempotencyKey = "") {
    const tx = this.db.transaction(() => {
      if (idempotencyKey) {
        const existing = this.db.prepare(`
          SELECT 1 FROM credits_ledger
          WHERE player_ref = ? AND external_ref = ? AND idempotency_key = ?
          LIMIT 1
        `).get(playerRef, sessionId, idempotencyKey);
        if (existing) return { ok: false as const, reason: "DUPLICATE" as const };
      }

      const prev = this.db.prepare("SELECT sessions_balance FROM credits_balances WHERE player_ref = ?").get(playerRef) as any;
      const prevBal = prev ? Number(prev.sessions_balance) : 0;
      if (prevBal < 1) return { ok: false as const, reason: "INSUFFICIENT" as const };

      const now = Date.now();
      const nextBal = prevBal - 1;

      this.db.prepare(`
        INSERT INTO credits_ledger
          (id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at_ms)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        playerRef,
        -1,
        "consume",
        "system",
        sessionId,
        idempotencyKey || null,
        idempotencyKey ? JSON.stringify({ idempotencyKey }) : null,
        now
      );

      if (prev) {
        this.db.prepare("UPDATE credits_balances SET sessions_balance = ?, updated_at_ms = ? WHERE player_ref = ?")
          .run(nextBal, now, playerRef);
      } else {
        this.db.prepare("INSERT INTO credits_balances(player_ref, sessions_balance, updated_at_ms) VALUES (?, ?, ?)")
          .run(playerRef, nextBal, now);
      }

      return { ok: true as const, balance: nextBal };
    });

    return tx();
  }

  /**
   * Idempotent crediting for Stripe webhook.
   * Returns true if newly recorded; false if duplicate.
   */
  recordWebhookEvent(provider: "stripe", eventId: string): boolean {
    const now = Date.now();
    try {
      this.db.prepare("INSERT INTO webhook_events(provider, event_id, received_at_ms) VALUES (?, ?, ?)")
        .run(provider, eventId, now);
      return true;
    } catch (e: any){
      return false;
    }
  }

  close() {
    this.db.close();
  }
}
