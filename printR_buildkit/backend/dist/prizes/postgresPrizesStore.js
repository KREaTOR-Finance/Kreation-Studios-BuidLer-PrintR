import { Pool } from "pg";
import { randomUUID } from "node:crypto";
function shouldUseSsl(databaseUrl) {
    return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}
export class PostgresPrizesStore {
    pool;
    constructor(databaseUrl) {
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
        });
    }
    async getProfile(playerRef) {
        const client = await this.pool.connect();
        try {
            await client.query("begin");
            await client.query("insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing", [playerRef]);
            const { rows } = await client.query("select player_ref, points, streak, total_rounds, updated_at from player_profiles where player_ref = $1", [playerRef]);
            await client.query("commit");
            return mapProfile(rows[0], playerRef);
        }
        catch (e) {
            await client.query("rollback");
            throw e;
        }
        finally {
            client.release();
        }
    }
    async listClaims(playerRef) {
        const { rows } = await this.pool.query(`select id, player_ref, prize_id, cost_points, status, created_at, meta_json
       from prize_claims
       where player_ref = $1
       order by created_at desc`, [playerRef]);
        return rows.map(mapClaim);
    }
    async resetPoints(playerRef) {
        const client = await this.pool.connect();
        try {
            await client.query("begin");
            await client.query("insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing", [playerRef]);
            const { rows } = await client.query(`update player_profiles
         set points = 0,
             updated_at = now()
         where player_ref = $1
         returning player_ref, points, streak, total_rounds, updated_at`, [playerRef]);
            await client.query("commit");
            return mapProfile(rows[0], playerRef);
        }
        catch (e) {
            await client.query("rollback");
            throw e;
        }
        finally {
            client.release();
        }
    }
    async claimPrize(playerRef, prizeId, costPoints) {
        const client = await this.pool.connect();
        try {
            await client.query("begin");
            await client.query("insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing", [playerRef]);
            const existing = await client.query("select * from prize_claims where player_ref = $1 and prize_id = $2 limit 1", [playerRef, prizeId]);
            if (existing.rowCount && existing.rowCount > 0) {
                const profileRes = await client.query("select player_ref, points, streak, total_rounds, updated_at from player_profiles where player_ref = $1", [playerRef]);
                await client.query("commit");
                return { claim: mapClaim(existing.rows[0]), profile: mapProfile(profileRes.rows[0], playerRef) };
            }
            const balRes = await client.query("select points from player_profiles where player_ref = $1 for update", [playerRef]);
            const currentPoints = Number(balRes.rows?.[0]?.points ?? 0);
            if (currentPoints < costPoints) {
                await client.query("rollback");
                throw new Error("INSUFFICIENT_POINTS");
            }
            const id = randomUUID();
            const now = new Date();
            await client.query(`insert into prize_claims
          (id, player_ref, prize_id, cost_points, status, meta_json, created_at)
         values
          ($1,$2,$3,$4,$5,$6,$7)`, [
                id,
                playerRef,
                prizeId,
                costPoints,
                "PENDING",
                null,
                now
            ]);
            const profileRes = await client.query(`update player_profiles
         set points = greatest(0, points - $2),
             updated_at = now()
         where player_ref = $1
         returning player_ref, points, streak, total_rounds, updated_at`, [playerRef, costPoints]);
            await client.query("commit");
            const claim = {
                id,
                playerRef,
                prizeId,
                costPoints,
                status: "PENDING",
                createdAt: now.getTime()
            };
            return { claim, profile: mapProfile(profileRes.rows[0], playerRef) };
        }
        catch (e) {
            await client.query("rollback");
            throw e;
        }
        finally {
            client.release();
        }
    }
}
function mapProfile(row, playerRefFallback) {
    return {
        playerRef: row?.player_ref ?? playerRefFallback,
        points: Number(row?.points ?? 0),
        streak: Number(row?.streak ?? 0),
        totalRounds: Number(row?.total_rounds ?? 0),
        updatedAt: row?.updated_at instanceof Date ? row.updated_at.getTime() : Date.parse(row?.updated_at ?? new Date().toISOString())
    };
}
function mapClaim(row) {
    return {
        id: String(row.id),
        playerRef: String(row.player_ref),
        prizeId: String(row.prize_id),
        costPoints: Number(row.cost_points),
        status: row.status,
        meta: row.meta_json ?? null,
        createdAt: row.created_at instanceof Date ? row.created_at.getTime() : Date.parse(row.created_at)
    };
}
