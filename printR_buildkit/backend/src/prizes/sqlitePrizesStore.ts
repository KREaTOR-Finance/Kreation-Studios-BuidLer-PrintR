import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { PlayerProfile } from "../rounds/store";
import type { PrizeClaim, PrizesStore } from "./store";

export class SqlitePrizesStore implements PrizesStore {
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

      CREATE TABLE IF NOT EXISTS prize_claims (
        id TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        prize_id TEXT NOT NULL,
        cost_points INTEGER NOT NULL,
        status TEXT NOT NULL,
        meta_json TEXT,
        created_at_ms INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_prize_claims_player_prize ON prize_claims(player_ref, prize_id);
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

  async listClaims(playerRef: string): Promise<PrizeClaim[]> {
    const rows = this.db.prepare(`
      SELECT id, player_ref, prize_id, cost_points, status, meta_json, created_at_ms
      FROM prize_claims
      WHERE player_ref = ?
      ORDER BY created_at_ms DESC
    `).all(playerRef) as any[];
    return rows.map(mapClaim);
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

  async claimPrize(playerRef: string, prizeId: string, costPoints: number): Promise<{ claim: PrizeClaim; profile: PlayerProfile }> {
    const tx = this.db.transaction(() => {
      const now = Date.now();
      this.db.prepare(`
        INSERT OR IGNORE INTO player_profiles(player_ref, points, streak, total_rounds, updated_at_ms)
        VALUES (?, 0, 0, 0, ?)
      `).run(playerRef, now);

      const existing = this.db.prepare(`
        SELECT * FROM prize_claims WHERE player_ref = ? AND prize_id = ? LIMIT 1
      `).get(playerRef, prizeId) as any;
      if (existing) {
        const profile = this.db.prepare(`
          SELECT player_ref, points, streak, total_rounds, updated_at_ms
          FROM player_profiles WHERE player_ref = ?
        `).get(playerRef) as any;
        return { claim: mapClaim(existing), profile: mapProfile(profile, playerRef) };
      }

      const profileRow = this.db.prepare(`
        SELECT points FROM player_profiles WHERE player_ref = ? LIMIT 1
      `).get(playerRef) as any;
      const currentPoints = Number(profileRow?.points ?? 0);
      if (currentPoints < costPoints) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      const id = randomUUID();
      this.db.prepare(`
        INSERT INTO prize_claims
          (id, player_ref, prize_id, cost_points, status, meta_json, created_at_ms)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        playerRef,
        prizeId,
        costPoints,
        "PENDING",
        null,
        now
      );

      this.db.prepare(`
        UPDATE player_profiles
        SET points = max(0, points - ?),
            updated_at_ms = ?
        WHERE player_ref = ?
      `).run(costPoints, now, playerRef);

      const profile = this.db.prepare(`
        SELECT player_ref, points, streak, total_rounds, updated_at_ms
        FROM player_profiles WHERE player_ref = ?
      `).get(playerRef) as any;

      const claim: PrizeClaim = {
        id,
        playerRef,
        prizeId,
        costPoints,
        status: "PENDING",
        createdAt: now
      };
      return { claim, profile: mapProfile(profile, playerRef) };
    });

    return tx();
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

function mapClaim(row: any): PrizeClaim {
  return {
    id: String(row.id),
    playerRef: String(row.player_ref),
    prizeId: String(row.prize_id),
    costPoints: Number(row.cost_points),
    status: row.status,
    meta: row.meta_json ? JSON.parse(row.meta_json) : null,
    createdAt: Number(row.created_at_ms)
  };
}
