import { Pool } from "pg";
import type { PlayerProfile, RoundRecord, RoundsStore } from "./store";

function shouldUseSsl(databaseUrl: string) {
  return databaseUrl.includes("supabase.co") || databaseUrl.includes("sslmode=require");
}

export class PostgresRoundsStore implements RoundsStore {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? ({ rejectUnauthorized: false } as any) : undefined
    });
  }

  async getProfile(playerRef: string): Promise<PlayerProfile> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing",
        [playerRef]
      );
      const { rows } = await client.query(
        "select player_ref, points, streak, total_rounds, updated_at from player_profiles where player_ref = $1",
        [playerRef]
      );
      await client.query("commit");
      return mapProfile(rows[0], playerRef);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async getRound(roundId: string): Promise<RoundRecord | null> {
    const { rows } = await this.pool.query(
      "select * from round_history where round_id = $1 limit 1",
      [roundId]
    );
    if (!rows || rows.length === 0) return null;
    return mapRound(rows[0]);
  }

  async resetPoints(playerRef: string): Promise<PlayerProfile> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing",
        [playerRef]
      );
      const { rows } = await client.query(
        `update player_profiles
         set points = 0,
             updated_at = now()
         where player_ref = $1
         returning player_ref, points, streak, total_rounds, updated_at`,
        [playerRef]
      );
      await client.query("commit");
      return mapProfile(rows[0], playerRef);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async recordRound(round: RoundRecord): Promise<{ round: RoundRecord; profile: PlayerProfile; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "insert into player_profiles (player_ref) values ($1) on conflict (player_ref) do nothing",
        [round.playerRef]
      );

      const existing = await client.query(
        "select * from round_history where round_id = $1 limit 1",
        [round.roundId]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        const profileRes = await client.query(
          "select player_ref, points, streak, total_rounds, updated_at from player_profiles where player_ref = $1",
          [round.playerRef]
        );
        await client.query("commit");
        return { round: mapRound(existing.rows[0]), profile: mapProfile(profileRes.rows[0], round.playerRef), created: false };
      }

      await client.query(
        `insert into round_history
          (round_id, player_ref, session_id, tier, direction, status, points_delta, streak_delta, randomness_hex, z_value,
           request_id, nonce, signature, proof_ref, proof_json, requested_at, fulfilled_at)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          round.roundId,
          round.playerRef,
          round.sessionId ?? null,
          round.tier,
          round.direction,
          round.status,
          round.pointsDelta,
          round.streakDelta,
          round.randomnessHex,
          round.z,
          round.requestId,
          round.nonce,
          round.signature,
          round.proofRef ?? null,
          round.proof ?? null,
          new Date(round.requestedAt),
          new Date(round.fulfilledAt)
        ]
      );

      const profileRes = await client.query(
        `update player_profiles
         set points = greatest(0, points + $2),
             streak = greatest(0, streak + $3),
             total_rounds = total_rounds + 1,
             updated_at = now()
         where player_ref = $1
         returning player_ref, points, streak, total_rounds, updated_at`,
        [round.playerRef, round.pointsDelta, round.streakDelta]
      );

      await client.query("commit");
      return { round, profile: mapProfile(profileRes.rows[0], round.playerRef), created: true };
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }

  async listRounds(playerRef: string, limit = 50): Promise<RoundRecord[]> {
    const { rows } = await this.pool.query(
      `select * from round_history
       where player_ref = $1
       order by fulfilled_at desc
       limit $2`,
      [playerRef, limit]
    );
    return rows.map(mapRound);
  }
}

function mapProfile(row: any, playerRefFallback: string): PlayerProfile {
  return {
    playerRef: row?.player_ref ?? playerRefFallback,
    points: Number(row?.points ?? 0),
    streak: Number(row?.streak ?? 0),
    totalRounds: Number(row?.total_rounds ?? 0),
    updatedAt: row?.updated_at instanceof Date ? row.updated_at.getTime() : Date.parse(row?.updated_at ?? new Date().toISOString())
  };
}

function mapRound(row: any): RoundRecord {
  return {
    roundId: String(row.round_id),
    playerRef: String(row.player_ref),
    sessionId: row.session_id ?? null,
    tier: row.tier,
    direction: row.direction,
    status: row.status,
    pointsDelta: Number(row.points_delta),
    streakDelta: Number(row.streak_delta),
    randomnessHex: String(row.randomness_hex),
    z: Number(row.z_value ?? row.z ?? 0),
    requestId: String(row.request_id ?? ""),
    nonce: String(row.nonce ?? ""),
    signature: String(row.signature ?? ""),
    proofRef: row.proof_ref ?? null,
    proof: row.proof_json ?? null,
    requestedAt: row.requested_at instanceof Date ? row.requested_at.getTime() : Date.parse(row.requested_at),
    fulfilledAt: row.fulfilled_at instanceof Date ? row.fulfilled_at.getTime() : Date.parse(row.fulfilled_at)
  };
}
