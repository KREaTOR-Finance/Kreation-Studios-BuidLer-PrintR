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
        balance_sessions INTEGER NOT NULL DEFAULT 0,
        updated_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS credits_ledger (
        id TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        delta_sessions INTEGER NOT NULL,
        reason TEXT NOT NULL,
        source TEXT NOT NULL,
        external_ref TEXT,
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
    `);
  }

  async getBalance(playerRef: string): Promise<number> {
    const row = this.db.prepare("SELECT balance_sessions FROM credits_balances WHERE player_ref = ?").get(playerRef) as any;
    return row ? Number(row.balance_sessions) : 0;
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
          (id, player_ref, delta_sessions, reason, source, external_ref, meta_json, created_at_ms)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        full.id,
        full.playerRef,
        full.deltaSessions,
        full.reason,
        full.source,
        full.externalRef ?? null,
        full.meta ? JSON.stringify(full.meta) : null,
        full.createdAt
      );

      const prev = this.db.prepare("SELECT balance_sessions FROM credits_balances WHERE player_ref = ?").get(full.playerRef) as any;
      const prevBal = prev ? Number(prev.balance_sessions) : 0;
      const nextBal = prevBal + full.deltaSessions;

      if (prev){
        this.db.prepare("UPDATE credits_balances SET balance_sessions = ?, updated_at_ms = ? WHERE player_ref = ?")
          .run(nextBal, now, full.playerRef);
      } else {
        this.db.prepare("INSERT INTO credits_balances(player_ref, balance_sessions, updated_at_ms) VALUES (?, ?, ?)")
          .run(full.playerRef, nextBal, now);
      }
    });

    tx();
    return full;
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
}
