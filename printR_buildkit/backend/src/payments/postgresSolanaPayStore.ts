import pg from "pg";
import type { SolanaPayIntent, SolanaPayStore } from "./solanaPayStore.js";

export class PostgresSolanaPayStore implements SolanaPayStore {
  private pool: pg.Pool;
  constructor(databaseUrl: string){
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async migrate(){
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS solana_pay_intents (
        reference TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        bundle TEXT NOT NULL,
        usd_cents INTEGER NOT NULL,
        sessions INTEGER NOT NULL,
        cluster TEXT NOT NULL,
        status TEXT NOT NULL,
        signature TEXT,
        created_at_ms BIGINT NOT NULL,
        paid_at_ms BIGINT
      );

      CREATE TABLE IF NOT EXISTS solana_pay_signatures (
        signature TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        created_at_ms BIGINT NOT NULL
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

    await this.pool.query(
      `INSERT INTO solana_pay_intents(reference, player_ref, bundle, usd_cents, sessions, cluster, status, signature, created_at_ms, paid_at_ms)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)` ,
      [intent.reference, intent.playerRef, intent.bundle, intent.usdCents, intent.sessions, intent.cluster, intent.status, null, intent.createdAtMs, null]
    );

    return intent;
  }

  async getIntent(reference: string): Promise<SolanaPayIntent | null> {
    const q = await this.pool.query("SELECT * FROM solana_pay_intents WHERE reference=$1", [reference]);
    const row = q.rows[0];
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
    const q = await this.pool.query("SELECT status FROM solana_pay_intents WHERE reference=$1", [reference]);
    const row = q.rows[0];
    if (!row) throw new Error("INTENT_NOT_FOUND");
    if (String(row.status) === "PAID") return false;

    await this.pool.query("UPDATE solana_pay_intents SET status='PAID', signature=$1, paid_at_ms=$2 WHERE reference=$3", [signature, paidAtMs, reference]);
    return true;
  }

  async isSignatureProcessed(signature: string): Promise<boolean> {
    const q = await this.pool.query("SELECT 1 FROM solana_pay_signatures WHERE signature=$1 LIMIT 1", [signature]);
    return (q.rowCount ?? 0) > 0;
  }

  async markSignatureProcessed(signature: string, reference: string, atMs: number): Promise<void> {
    try {
      await this.pool.query("INSERT INTO solana_pay_signatures(signature, reference, created_at_ms) VALUES($1,$2,$3)", [signature, reference, atMs]);
    } catch {
      // ignore
    }
  }
}
