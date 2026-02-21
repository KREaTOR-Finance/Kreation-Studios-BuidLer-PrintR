import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
export class SqliteAnalyticsStore {
    db;
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
    }
    migrate() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        player_ref TEXT NOT NULL,
        event TEXT NOT NULL,
        session_id TEXT,
        meta_json TEXT,
        created_at_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_player_time ON analytics_events(player_ref, created_at_ms DESC);
    `);
    }
    async record(entry) {
        const now = Date.now();
        const full = { ...entry, id: randomUUID(), createdAt: now };
        this.db.prepare(`
      INSERT INTO analytics_events
        (id, player_ref, event, session_id, meta_json, created_at_ms)
      VALUES
        (?, ?, ?, ?, ?, ?)
    `).run(full.id, full.playerRef, full.event, full.sessionId ?? null, full.meta ? JSON.stringify(full.meta) : null, now);
        return full;
    }
}
