import Database from "better-sqlite3";
import type { SolanaPayIntent, SolanaPayStore } from "./solanaPayStore.js";

export class SqliteSolanaPayStore implements SolanaPayStore {
  private db: Database.Database;

  constructor(dbPath: string){
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  migrate(){
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS solana_pay_intents (
        reference TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        bundle TEXT NOT NULL,
        usd_cents INTEGER NOT NULL,
        sessions INTEGER NOT NULL,
        cluster TEXT NOT NULL,
        status TEXT NOT NULL,
        signature TEXT,
        created_at_ms INTEGER NOT NULL,
        paid_at_ms INTEGER
      );

      CREATE TABLE IF NOT EXISTS solana_pay_signatures (
        signature TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_solana_pay_intents_player ON solana_pay_intents(player_ref, created_at_ms DESC);
    `);
  }

  async createIntent(i: Omit<SolanaPayIntent, "status" | "createdAtMs" | "paidAtMs">): Promise<SolanaPayIntent> {
    const now = Date.now();
    const intent: SolanaPayIntent = {
      ...i,
      status: "PENDING",
      signature: null,
      createdAtMs: now,
      paidAtMs: null
    };

    this.db.prepare(
      `INSERT INTO solana_pay_intents(reference, player_ref, bundle, usd_cents, sessions, cluster, status, signature, created_at_ms, paid_at_ms)
       VALUES(?,?,?,?,?,?,?,?,?,?)`
    ).run(
      intent.reference,
      intent.playerRef,
      intent.bundle,
      intent.usdCents,
      intent.sessions,
      intent.cluster,
      intent.status,
      null,
      intent.createdAtMs,
      null
    );

    return intent;
  }

  async getIntent(reference: string): Promise<SolanaPayIntent | null> {
    const row = this.db.prepare("SELECT * FROM solana_pay_intents WHERE reference=?").get(reference) as any;
    if (!row) return null;
    return {
      reference: String(row.reference),
      playerRef: String(row.player_ref),
      bundle: String(row.bundle),
      usdCents: Number(row.usd_cents),
      sessions: Number(row.sessions),
      cluster: String(row.cluster) as any,
      status: String(row.status) as any,
      signature: row.signature ?? null,
      createdAtMs: Number(row.created_at_ms),
      paidAtMs: row.paid_at_ms ?? null
    };
  }

  async markPaid(reference: string, signature: string, paidAtMs: number): Promise<boolean> {
    const row = this.db.prepare("SELECT status FROM solana_pay_intents WHERE reference=?").get(reference) as any;
    if (!row) throw new Error("INTENT_NOT_FOUND");
    if (String(row.status) === "PAID") return false;

    this.db.prepare("UPDATE solana_pay_intents SET status='PAID', signature=?, paid_at_ms=? WHERE reference=?")
      .run(signature, paidAtMs, reference);
    return true;
  }

  async isSignatureProcessed(signature: string): Promise<boolean> {
    const row = this.db.prepare("SELECT 1 FROM solana_pay_signatures WHERE signature=? LIMIT 1").get(signature) as any;
    return !!row;
  }

  async markSignatureProcessed(signature: string, reference: string, atMs: number): Promise<void> {
    try {
      this.db.prepare("INSERT INTO solana_pay_signatures(signature, reference, created_at_ms) VALUES(?,?,?)")
        .run(signature, reference, atMs);
    } catch {
      // ignore duplicates
    }
  }
}
