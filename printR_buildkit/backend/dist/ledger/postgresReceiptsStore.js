import { Pool } from "pg";
import { randomUUID } from "node:crypto";
function shouldUseSsl(databaseUrl) {
    return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}
export class PostgresReceiptsStore {
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
        await this.pool.query(`insert into receipts
        (id, player_ref, delta_sessions, delta_points, reason, source, external_ref, meta_json, created_at)
       values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
            id,
            entry.playerRef,
            entry.deltaSessions,
            entry.deltaPoints,
            entry.reason,
            entry.source,
            entry.externalRef ?? null,
            entry.meta ?? null,
            now
        ]);
        return { id, createdAt: now.getTime(), ...entry };
    }
    async list(playerRef, limit = 100) {
        const { rows } = await this.pool.query(`select id, player_ref, delta_sessions, delta_points, reason, source, external_ref, meta_json, created_at
       from receipts
       where player_ref = $1
       order by created_at desc
       limit $2`, [playerRef, limit]);
        return rows.map(row => ({
            id: row.id,
            playerRef: row.player_ref,
            deltaSessions: Number(row.delta_sessions),
            deltaPoints: Number(row.delta_points),
            reason: row.reason,
            source: row.source,
            externalRef: row.external_ref ?? null,
            meta: row.meta_json ?? null,
            createdAt: row.created_at instanceof Date ? row.created_at.getTime() : Date.parse(row.created_at)
        }));
    }
}
