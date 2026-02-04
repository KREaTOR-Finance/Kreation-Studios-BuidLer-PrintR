import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { AnalyticsEvent, AnalyticsStore } from "./store";

function shouldUseSsl(databaseUrl: string) {
  return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}

export class PostgresAnalyticsStore implements AnalyticsStore {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? ({ rejectUnauthorized: false } as any) : undefined
    });
  }

  async record(entry: Omit<AnalyticsEvent, "id" | "createdAt">): Promise<AnalyticsEvent> {
    const id = randomUUID();
    const now = new Date();
    await this.pool.query(
      `insert into analytics_events
        (id, player_ref, event, session_id, meta_json, created_at)
       values
        ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        entry.playerRef,
        entry.event,
        entry.sessionId ?? null,
        entry.meta ?? null,
        now
      ]
    );
    return { id, createdAt: now.getTime(), ...entry };
  }
}
