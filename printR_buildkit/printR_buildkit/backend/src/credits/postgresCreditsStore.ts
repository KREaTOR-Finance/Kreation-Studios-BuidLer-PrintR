/**
 * PostgresCreditsStore (Supabase-ready)
 * - Authoritative sessions balance + append-only ledger
 * - Designed for trust-first MVP where backend owns all mutations
 *
 * ENV:
 * - DATABASE_URL (Supabase Postgres connection string)
 *
 * NOTE:
 * - In production, ensure you use a pooled connection (pg.Pool) and transactions.
 */
import type { CreditsStore, CreditLedgerEntry, CreditBalance } from "./store";
import { Pool } from "pg";

export class PostgresCreditsStore implements CreditsStore {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async ensureProfile(telegramId: string): Promise<void> {
    const q = `
      insert into profiles (telegram_id)
      values ($1)
      on conflict (telegram_id) do nothing;
      insert into credits_balances (telegram_id)
      values ($1)
      on conflict (telegram_id) do nothing;
    `;
    // use a client so both statements run; Postgres allows multi-stmt if enabled; safest is two queries in txn.
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into profiles (telegram_id) values ($1) on conflict (telegram_id) do nothing", [telegramId]);
      await client.query("insert into credits_balances (telegram_id) values ($1) on conflict (telegram_id) do nothing", [telegramId]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async getBalance(telegramId: string): Promise<CreditBalance> {
    await this.ensureProfile(telegramId);
    const { rows } = await this.pool.query(
      "select sessions_balance as sessionsBalance from credits_balances where telegram_id = $1",
      [telegramId]
    );
    return { telegramId, sessionsBalance: Number(rows?.[0]?.sessionsbalance ?? rows?.[0]?.sessionsBalance ?? 0) };
  }

  async applyDelta(entry: CreditLedgerEntry): Promise<CreditBalance> {
    // Idempotency: if sourceRef is a webhook event id, caller should enforce once via stripe_webhook_events
    await this.ensureProfile(entry.telegramId);

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      // lock row for update
      const balRes = await client.query(
        "select sessions_balance from credits_balances where telegram_id=$1 for update",
        [entry.telegramId]
      );
      const current = Number(balRes.rows[0].sessions_balance);

      const next = current + Number(entry.deltaSessions);
      if (next < 0) {
        throw new Error("INSUFFICIENT_SESSIONS");
      }

      await client.query(
        "update credits_balances set sessions_balance=$2 where telegram_id=$1",
        [entry.telegramId, next]
      );

      await client.query(
        `insert into credits_ledger (telegram_id, delta_sessions, reason, source_ref, idempotency_key, metadata)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          entry.telegramId,
          entry.deltaSessions,
          entry.reason,
          entry.sourceRef ?? null,
          entry.idempotencyKey ?? null,
          entry.metadata ?? {},
        ]
      );

      await client.query("commit");
      return { telegramId: entry.telegramId, sessionsBalance: next };
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async markStripeEventProcessed(stripeEventId: string, metadata: any = {}): Promise<boolean> {
    // returns true if inserted (first time), false if already exists
    const res = await this.pool.query(
      "insert into stripe_webhook_events (stripe_event_id, metadata) values ($1,$2) on conflict (stripe_event_id) do nothing",
      [stripeEventId, metadata]
    );
    return res.rowCount === 1;
  }
}
