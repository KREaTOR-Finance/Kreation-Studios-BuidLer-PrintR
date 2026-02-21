import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import pg from "pg";
export function createDeveloperLeadsStore() {
    const databaseUrl = process.env.DATABASE_URL; // Supabase Postgres compatible
    if (databaseUrl)
        return new PgDeveloperLeadsStore(databaseUrl);
    const path = process.env.DEVELOPER_LEADS_DB_PATH || process.env.DATABASE_PATH; // fallback to same sqlite file
    if (path)
        return new SqliteDeveloperLeadsStore(path);
    return new InMemoryDeveloperLeadsStore();
}
export function buildLeadFromRequest(req, body, playerRef) {
    const ip = req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : (req.socket.remoteAddress ?? "");
    const ua = String(req.headers["user-agent"] ?? "");
    return {
        name: String(body.name ?? "").trim(),
        email: String(body.email ?? "").trim(),
        studio: String(body.studio ?? "").trim() || undefined,
        gameTitle: String(body.gameTitle ?? "").trim(),
        gameLink: String(body.gameLink ?? "").trim() || undefined,
        pitch: String(body.pitch ?? "").trim(),
        stack: String(body.stack ?? "").trim() || undefined,
        socials: String(body.socials ?? "").trim() || undefined,
        notes: String(body.notes ?? "").trim() || undefined,
        playerRef,
        ip,
        userAgent: ua,
    };
}
export function validateLead(input) {
    if (!input.name || input.name.length < 2)
        return "NAME_REQUIRED";
    if (!input.email || input.email.length < 5)
        return "EMAIL_REQUIRED";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email);
    if (!emailOk)
        return "EMAIL_INVALID";
    if (!input.gameTitle || input.gameTitle.length < 2)
        return "GAME_TITLE_REQUIRED";
    if (!input.pitch || input.pitch.length < 20)
        return "PITCH_TOO_SHORT";
    if (input.pitch.length > 2000)
        return "PITCH_TOO_LONG";
    if (input.gameLink && input.gameLink.length > 500)
        return "LINK_TOO_LONG";
    return null;
}
function mapLeadRow(row) {
    return {
        id: String(row.id),
        createdAt: String(row.created_at),
        name: String(row.name),
        email: String(row.email),
        studio: row.studio ?? undefined,
        gameTitle: String(row.game_title),
        gameLink: row.game_link ?? undefined,
        pitch: String(row.pitch),
        stack: row.stack ?? undefined,
        socials: row.socials ?? undefined,
        notes: row.notes ?? undefined,
        playerRef: row.player_ref ?? undefined,
        ip: row.ip ?? undefined,
        userAgent: row.user_agent ?? undefined,
    };
}
class InMemoryDeveloperLeadsStore {
    leads = [];
    migrate() { }
    async createLead(input) {
        const id = randomUUID();
        this.leads.push({ id, createdAt: new Date().toISOString(), ...input });
        return { id };
    }
    async listLeads(params) {
        const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
        const offset = Math.max(0, params?.offset ?? 0);
        const sorted = [...this.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { leads: sorted.slice(offset, offset + limit), total: sorted.length };
    }
}
class SqliteDeveloperLeadsStore {
    db;
    constructor(path) {
        this.db = new Database(path);
    }
    migrate() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS developer_leads (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        studio TEXT,
        game_title TEXT NOT NULL,
        game_link TEXT,
        pitch TEXT NOT NULL,
        stack TEXT,
        socials TEXT,
        notes TEXT,
        player_ref TEXT,
        ip TEXT,
        user_agent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_developer_leads_created_at ON developer_leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_developer_leads_email ON developer_leads(email);
    `);
    }
    async createLead(input) {
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO developer_leads (
        id, created_at, name, email, studio, game_title, game_link, pitch, stack, socials, notes, player_ref, ip, user_agent
      ) VALUES (
        @id, @createdAt, @name, @email, @studio, @gameTitle, @gameLink, @pitch, @stack, @socials, @notes, @playerRef, @ip, @userAgent
      )
    `);
        stmt.run({ id, createdAt, ...input });
        return { id };
    }
    async listLeads(params) {
        const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
        const offset = Math.max(0, params?.offset ?? 0);
        const rows = this.db.prepare(`
      SELECT id, created_at, name, email, studio, game_title, game_link, pitch, stack, socials, notes, player_ref, ip, user_agent
      FROM developer_leads
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
        const totalRow = this.db.prepare("SELECT COUNT(*) as total FROM developer_leads").get();
        return { leads: rows.map(mapLeadRow), total: Number(totalRow.total ?? 0) };
    }
}
class PgDeveloperLeadsStore {
    pool;
    constructor(databaseUrl) {
        this.pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    }
    migrate() { }
    async createLead(input) {
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await this.pool.query(`INSERT INTO developer_leads
        (id, created_at, name, email, studio, game_title, game_link, pitch, stack, socials, notes, player_ref, ip, user_agent)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [
            id, createdAt, input.name, input.email, input.studio ?? null, input.gameTitle,
            input.gameLink ?? null, input.pitch, input.stack ?? null, input.socials ?? null,
            input.notes ?? null, input.playerRef ?? null, input.ip ?? null, input.userAgent ?? null
        ]);
        return { id };
    }
    async listLeads(params) {
        const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
        const offset = Math.max(0, params?.offset ?? 0);
        const { rows } = await this.pool.query(`SELECT id, created_at, name, email, studio, game_title, game_link, pitch, stack, socials, notes, player_ref, ip, user_agent
       FROM developer_leads
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
        const totalRes = await this.pool.query("SELECT COUNT(*) as total FROM developer_leads");
        const total = Number(totalRes.rows?.[0]?.total ?? 0);
        return { leads: rows.map(mapLeadRow), total };
    }
}
