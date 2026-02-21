import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
export class SqliteReceiptsStore {
    db;
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
    }
    migrate() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        delta_sessions INTEGER NOT NULL DEFAULT 0,
        delta_points INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        source TEXT NOT NULL,
        external_ref TEXT,
        meta_json TEXT,
        created_at_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipts_player_time ON receipts(player_ref, created_at_ms DESC);
    `);
    }
    async record(entry) {
        const now = Date.now();
        const full = { ...entry, id: randomUUID(), createdAt: now };
        this.db.prepare(`
      INSERT INTO receipts
        (id, player_ref, delta_sessions, delta_points, reason, source, external_ref, meta_json, created_at_ms)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(full.id, full.playerRef, full.deltaSessions, full.deltaPoints, full.reason, full.source, full.externalRef ?? null, full.meta ? JSON.stringify(full.meta) : null, now);
        return full;
    }
    async list(playerRef, limit = 100) {
        const rows = this.db.prepare(`
      SELECT id, player_ref, delta_sessions, delta_points, reason, source, external_ref, meta_json, created_at_ms
      FROM receipts
      WHERE player_ref = ?
      ORDER BY created_at_ms DESC
      LIMIT ?
    `).all(playerRef, limit);
        return rows.map(row => ({
            id: String(row.id),
            playerRef: String(row.player_ref),
            deltaSessions: Number(row.delta_sessions),
            deltaPoints: Number(row.delta_points),
            reason: row.reason,
            source: row.source,
            externalRef: row.external_ref ?? null,
            meta: row.meta_json ? JSON.parse(row.meta_json) : null,
            createdAt: Number(row.created_at_ms)
        }));
    }
}
