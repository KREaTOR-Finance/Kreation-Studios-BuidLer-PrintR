import Database from "better-sqlite3";
import type { PlayerProfile, RoundRecord, RoundsStore } from "./store";

export class SqliteRoundsStore implements RoundsStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        player_ref TEXT PRIMARY KEY,
        points INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        total_rounds INTEGER NOT NULL DEFAULT 0,
        updated_at_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS round_history (
        round_id TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        session_id TEXT,
        tier TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT NOT NULL,
        points_delta INTEGER NOT NULL,
        streak_delta INTEGER NOT NULL,
        randomness_hex TEXT NOT NULL,
        z_value REAL NOT NULL,
        request_id TEXT,
        nonce TEXT NOT NULL,
        signature TEXT NOT NULL,
        proof_ref TEXT,
        proof_json TEXT,
        requested_at_ms INTEGER NOT NULL,
        fulfilled_at_ms INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rounds_player_time ON round_history(player_ref, fulfilled_at_ms DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_player_nonce ON round_history(player_ref, nonce);
    `);
  }

  async getProfile(playerRef: string): Promise<PlayerProfile> {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR IGNORE INTO player_profiles(player_ref, points, streak, total_rounds, updated_at_ms)
      VALUES (?, 0, 0, 0, ?)
    `).run(playerRef, now);

    const row = this.db.prepare(`
      SELECT player_ref, points, streak, total_rounds, updated_at_ms
      FROM player_profiles
      WHERE player_ref = ?
    `).get(playerRef) as any;

    return mapProfile(row, playerRef);
  }

  async getRound(roundId: string): Promise<RoundRecord | null> {
    const row = this.db.prepare(`
      SELECT * FROM round_history WHERE round_id = ? LIMIT 1
    `).get(roundId) as any;
    return row ? mapRound(row) : null;
  }

  async resetPoints(playerRef: string): Promise<PlayerProfile> {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR IGNORE INTO player_profiles(player_ref, points, streak, total_rounds, updated_at_ms)
      VALUES (?, 0, 0, 0, ?)
    `).run(playerRef, now);

    this.db.prepare(`
      UPDATE player_profiles
      SET points = 0,
          updated_at_ms = ?
      WHERE player_ref = ?
    `).run(now, playerRef);

    const row = this.db.prepare(`
      SELECT player_ref, points, streak, total_rounds, updated_at_ms
      FROM player_profiles
      WHERE player_ref = ?
    `).get(playerRef) as any;

    return mapProfile(row, playerRef);
  }

  async recordRound(round: RoundRecord): Promise<{ round: RoundRecord; profile: PlayerProfile; created: boolean }> {
    const tx = this.db.transaction(() => {
      const now = Date.now();
      this.db.prepare(`
        INSERT OR IGNORE INTO player_profiles(player_ref, points, streak, total_rounds, updated_at_ms)
        VALUES (?, 0, 0, 0, ?)
      `).run(round.playerRef, now);

      const existing = this.db.prepare(`
        SELECT * FROM round_history WHERE round_id = ? LIMIT 1
      `).get(round.roundId) as any;

      if (existing) {
        const profile = this.db.prepare(`
          SELECT player_ref, points, streak, total_rounds, updated_at_ms
          FROM player_profiles WHERE player_ref = ?
        `).get(round.playerRef) as any;
        return { round: mapRound(existing), profile: mapProfile(profile, round.playerRef), created: false };
      }

      this.db.prepare(`
        INSERT INTO round_history
          (round_id, player_ref, session_id, tier, direction, status, points_delta, streak_delta,
           randomness_hex, z_value, request_id, nonce, signature, proof_ref, proof_json, requested_at_ms, fulfilled_at_ms)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
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
        round.proof ? JSON.stringify(round.proof) : null,
        round.requestedAt,
        round.fulfilledAt
      );

      this.db.prepare(`
        UPDATE player_profiles
        SET points = max(0, points + ?),
            streak = max(0, streak + ?),
            total_rounds = total_rounds + 1,
            updated_at_ms = ?
        WHERE player_ref = ?
      `).run(round.pointsDelta, round.streakDelta, now, round.playerRef);

      const profile = this.db.prepare(`
        SELECT player_ref, points, streak, total_rounds, updated_at_ms
        FROM player_profiles WHERE player_ref = ?
      `).get(round.playerRef) as any;

      return { round, profile: mapProfile(profile, round.playerRef), created: true };
    });

    return tx();
  }

  async listRounds(playerRef: string, limit = 50): Promise<RoundRecord[]> {
    const rows = this.db.prepare(`
      SELECT * FROM round_history
      WHERE player_ref = ?
      ORDER BY fulfilled_at_ms DESC
      LIMIT ?
    `).all(playerRef, limit) as any[];
    return rows.map(mapRound);
  }
}

function mapProfile(row: any, fallback: string): PlayerProfile {
  return {
    playerRef: row?.player_ref ?? fallback,
    points: Number(row?.points ?? 0),
    streak: Number(row?.streak ?? 0),
    totalRounds: Number(row?.total_rounds ?? 0),
    updatedAt: Number(row?.updated_at_ms ?? Date.now())
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
    z: Number(row.z_value ?? 0),
    requestId: String(row.request_id ?? ""),
    nonce: String(row.nonce ?? ""),
    signature: String(row.signature ?? ""),
    proofRef: row.proof_ref ?? null,
    proof: row.proof_json ? JSON.parse(row.proof_json) : null,
    requestedAt: Number(row.requested_at_ms),
    fulfilledAt: Number(row.fulfilled_at_ms)
  };
}
