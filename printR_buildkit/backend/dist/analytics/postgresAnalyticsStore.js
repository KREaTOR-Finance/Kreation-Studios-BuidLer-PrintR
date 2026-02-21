import { Pool } from "pg";
import { randomUUID } from "node:crypto";
function shouldUseSsl(databaseUrl) {
    return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}
export class PostgresAnalyticsStore {
    pool;
    constructor(databaseUrl) {
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
        });
    }
    async record(entry) {
        const id = randomUUID();
        const now = new Date();
        await this.pool.query(`insert into analytics_events
        (id, player_ref, event, session_id, meta_json, created_at)
       values
        ($1,$2,$3,$4,$5,$6)`, [
            id,
            entry.playerRef,
            entry.event,
            entry.sessionId ?? null,
            entry.meta ?? null,
            now
        ]);
        return { id, createdAt: now.getTime(), ...entry };
    }
}
