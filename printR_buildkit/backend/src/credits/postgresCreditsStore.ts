import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { CreditLedgerEntry, CreditsStore } from "./store";

function shouldUseSsl(databaseUrl: string) {
  return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}

export class PostgresCreditsStore implements CreditsStore {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? ({ rejectUnauthorized: false } as any) : undefined
    });
  }

  private async ensurePlayer(playerRef: string): Promise<void> {
    const telegramId = playerRef.startsWith("tg:") ? playerRef.slice(3) : null;
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "insert into players (player_ref, telegram_user_id) values ($1, $2) on conflict (player_ref) do nothing",
        [playerRef, telegramId]
      );
      await client.query(
        "insert into credits_balances (player_ref, sessions_balance) values ($1, 0) on conflict (player_ref) do nothing",
        [playerRef]
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async getBalance(playerRef: string): Promise<number> {
    await this.ensurePlayer(playerRef);
    const { rows } = await this.pool.query(
      "select sessions_balance from credits_balances where player_ref = $1",
      [playerRef]
    );
    return Number(rows?.[0]?.sessions_balance ?? 0);
  }

  async addLedger(entry: Omit<CreditLedgerEntry, "id" | "createdAt">): Promise<CreditLedgerEntry> {
    await this.ensurePlayer(entry.playerRef);
    const id = randomUUID();
    const now = new Date();

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      const balRes = await client.query(
        "select sessions_balance from credits_balances where player_ref = $1 for update",
        [entry.playerRef]
      );
      const current = Number(balRes.rows?.[0]?.sessions_balance ?? 0);
      const next = current + entry.deltaSessions;
      if (next < 0) throw new Error("INSUFFICIENT_SESSIONS");

      await client.query(
        "update credits_balances set sessions_balance = $2 where player_ref = $1",
        [entry.playerRef, next]
      );

      await client.query(
        `insert into credits_ledger
          (id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          entry.playerRef,
          entry.deltaSessions,
          entry.reason,
          entry.source,
          entry.externalRef ?? null,
          entry.idempotencyKey ?? null,
          entry.meta ?? null,
          now
        ]
      );

      await client.query("commit");
      return { id, createdAt: now.getTime(), ...entry };
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async listLedger(playerRef: string, limit = 100): Promise<CreditLedgerEntry[]> {
    const { rows } = await this.pool.query(
      `select id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at
       from credits_ledger
       where player_ref = $1
       order by created_at desc
       limit $2`,
      [playerRef, limit]
    );

    return rows.map(row => ({
      id: row.id,
      playerRef: row.player_ref,
      deltaSessions: Number(row.delta_sessions),
      reason: row.reason,
      source: row.source,
      externalRef: row.external_ref ?? null,
      idempotencyKey: row.idempotency_key ?? null,
      meta: row.meta_json ?? null,
      createdAt: row.created_at instanceof Date ? row.created_at.getTime() : Date.parse(row.created_at)
    }));
  }

  async consumeOneSession(playerRef: string, sessionId: string, idempotencyKey = "") {
    await this.ensurePlayer(playerRef);
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      if (idempotencyKey) {
        const dup = await client.query(
          "select 1 from credits_ledger where player_ref = $1 and external_ref = $2 and idempotency_key = $3 limit 1",
          [playerRef, sessionId, idempotencyKey]
        );
        if (dup.rowCount && dup.rowCount > 0) {
          await client.query("rollback");
          return { ok: false as const, reason: "DUPLICATE" as const };
        }
      }

      const balRes = await client.query(
        "select sessions_balance from credits_balances where player_ref = $1 for update",
        [playerRef]
      );
      const current = Number(balRes.rows?.[0]?.sessions_balance ?? 0);
      if (current < 1) {
        await client.query("rollback");
        return { ok: false as const, reason: "INSUFFICIENT" as const };
      }

      const next = current - 1;
      const now = new Date();
      await client.query(
        "update credits_balances set sessions_balance = $2 where player_ref = $1",
        [playerRef, next]
      );
      await client.query(
        `insert into credits_ledger
          (id, player_ref, delta_sessions, reason, source, external_ref, idempotency_key, meta_json, created_at)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(),
          playerRef,
          -1,
          "consume",
          "system",
          sessionId,
          idempotencyKey || null,
          idempotencyKey ? { idempotencyKey } : null,
          now
        ]
      );

      await client.query("commit");
      return { ok: true as const, balance: next };
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async recordWebhookEvent(provider: "stripe", eventId: string): Promise<boolean> {
    const res = await this.pool.query(
      "insert into webhook_events (provider, event_id) values ($1, $2) on conflict do nothing",
      [provider, eventId]
    );
    return res.rowCount === 1;
  }
}
