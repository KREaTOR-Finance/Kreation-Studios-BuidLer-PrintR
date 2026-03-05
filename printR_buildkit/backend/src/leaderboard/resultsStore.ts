import Database from "better-sqlite3";

export type SessionResult = {
  sessionId: string;
  wallet: string; // base58 pubkey
  finalScore: number;
  commitsUsed: number;
  endedAtMs: number;
};

export interface ResultsStore {
  upsert(r: SessionResult): Promise<void>;
  listSession(sessionId: string): Promise<SessionResult[]>;
  sumAllTime(): Promise<Array<{ wallet: string; totalScore: number; sessionsPlayed: number }>>;
}

export class InMemoryResultsStore implements ResultsStore {
  private rows: SessionResult[] = [];

  async upsert(r: SessionResult): Promise<void> {
    const idx = this.rows.findIndex((x) => x.sessionId === r.sessionId && x.wallet === r.wallet);
    if (idx >= 0) this.rows[idx] = r;
    else this.rows.push(r);
  }

  async listSession(sessionId: string): Promise<SessionResult[]> {
    return this.rows.filter((x) => x.sessionId === sessionId).sort((a, b) => b.finalScore - a.finalScore);
  }

  async sumAllTime(): Promise<Array<{ wallet: string; totalScore: number; sessionsPlayed: number }>> {
    const map = new Map<string, { wallet: string; totalScore: number; sessionsPlayed: number }>();
    for (const r of this.rows) {
      const cur = map.get(r.wallet) ?? { wallet: r.wallet, totalScore: 0, sessionsPlayed: 0 };
      cur.totalScore += r.finalScore;
      cur.sessionsPlayed += 1;
      map.set(r.wallet, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
  }
}

export class SqliteResultsStore implements ResultsStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_results (
        session_id TEXT NOT NULL,
        wallet TEXT NOT NULL,
        final_score REAL NOT NULL,
        commits_used INTEGER NOT NULL,
        ended_at_ms INTEGER NOT NULL,
        PRIMARY KEY(session_id, wallet)
      );
      CREATE INDEX IF NOT EXISTS idx_session_results_wallet ON session_results(wallet, ended_at_ms DESC);
      CREATE INDEX IF NOT EXISTS idx_session_results_session ON session_results(session_id, final_score DESC);
    `);
  }

  async upsert(r: SessionResult): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO session_results(session_id, wallet, final_score, commits_used, ended_at_ms)
         VALUES(?,?,?,?,?)
         ON CONFLICT(session_id, wallet) DO UPDATE SET
           final_score=excluded.final_score,
           commits_used=excluded.commits_used,
           ended_at_ms=excluded.ended_at_ms`
      )
      .run(r.sessionId, r.wallet, r.finalScore, r.commitsUsed, r.endedAtMs);
  }

  async listSession(sessionId: string): Promise<SessionResult[]> {
    const rows = this.db
      .prepare(
        `SELECT session_id as sessionId, wallet, final_score as finalScore, commits_used as commitsUsed, ended_at_ms as endedAtMs
         FROM session_results
         WHERE session_id=?
         ORDER BY final_score DESC`
      )
      .all(sessionId) as any[];
    return rows.map((r) => ({
      sessionId: String(r.sessionId),
      wallet: String(r.wallet),
      finalScore: Number(r.finalScore),
      commitsUsed: Number(r.commitsUsed),
      endedAtMs: Number(r.endedAtMs)
    }));
  }

  async sumAllTime(): Promise<Array<{ wallet: string; totalScore: number; sessionsPlayed: number }>> {
    const rows = this.db
      .prepare(
        `SELECT wallet, SUM(final_score) as totalScore, COUNT(*) as sessionsPlayed
         FROM session_results
         GROUP BY wallet
         ORDER BY totalScore DESC`
      )
      .all() as any[];
    return rows.map((r) => ({
      wallet: String(r.wallet),
      totalScore: Number(r.totalScore ?? 0),
      sessionsPlayed: Number(r.sessionsPlayed ?? 0)
    }));
  }
}
