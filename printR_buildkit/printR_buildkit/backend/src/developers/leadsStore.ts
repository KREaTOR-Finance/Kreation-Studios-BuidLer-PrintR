import { randomUUID } from "node:crypto";
import type { Request } from "express";
import Database from "better-sqlite3";
import pg from "pg";

export type DeveloperLead = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  studio?: string;
  gameTitle: string;
  gameLink?: string;
  pitch: string;
  stack?: string;
  socials?: string;
  notes?: string;
  playerRef?: string; // optional if coming from Telegram/web identity
  ip?: string;
  userAgent?: string;
};

export type CreateLeadInput = Omit<DeveloperLead, "id" | "createdAt">;

export interface DeveloperLeadsStore {
  migrate(): void;
  createLead(input: CreateLeadInput): Promise<{ id: string }>;
  listLeads(params?: { limit?: number; offset?: number }): Promise<{ leads: DeveloperLead[]; total?: number }>;
}

export function createDeveloperLeadsStore() : DeveloperLeadsStore {
  const databaseUrl = process.env.DATABASE_URL; // Supabase Postgres compatible
  if (databaseUrl) return new PgDeveloperLeadsStore(databaseUrl);

  const path = process.env.DEVELOPER_LEADS_DB_PATH || process.env.DATABASE_PATH; // fallback to same sqlite file
  if (path) return new SqliteDeveloperLeadsStore(path);

  return new InMemoryDeveloperLeadsStore();
}

export function buildLeadFromRequest(req: Request, body: any, playerRef?: string): CreateLeadInput {
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

export function validateLead(input: CreateLeadInput): string | null {
  if (!input.name || input.name.length < 2) return "NAME_REQUIRED";
  if (!input.email || input.email.length < 5) return "EMAIL_REQUIRED";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email);
  if (!emailOk) return "EMAIL_INVALID";
  if (!input.gameTitle || input.gameTitle.length < 2) return "GAME_TITLE_REQUIRED";
  if (!input.pitch || input.pitch.length < 20) return "PITCH_TOO_SHORT";
  if (input.pitch.length > 2000) return "PITCH_TOO_LONG";
  if (input.gameLink && input.gameLink.length > 500) return "LINK_TOO_LONG";
  return null;
}

class InMemoryDeveloperLeadsStore implements DeveloperLeadsStore {
  private leads: DeveloperLead[] = [];
  migrate(){ /* no-op */ }
  async createLead(input: CreateLeadInput){
    const id = randomUUID();
    this.leads.push({ id, createdAt: new Date().toISOString(), ...input });
    return { id };
  }
  async listLeads(params?: { limit?: number; offset?: number }){
    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    const sorted = [...this.leads].sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
    return { leads: sorted.slice(offset, offset + limit), total: sorted.length };
  }
}

class SqliteDeveloperLeadsStore implements DeveloperLeadsStore {
  private db: Database.Database;
  constructor(path: string){
    this.db = new Database(path);
  }
  migrate(){
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
  async createLead(input: CreateLeadInput){
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
  async listLeads(params?: { limit?: number; offset?: number }){
    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    const sorted = [...this.leads].sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
    return { leads: sorted.slice(offset, offset + limit), total: sorted.length };
  }
}

class PgDeveloperLeadsStore implements DeveloperLeadsStore {
  private pool: pg.Pool;
  constructor(databaseUrl: string){
    this.pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } as any });
  }
  migrate(){ /* prefer migrations; keep no-op */ }
  async createLead(input: CreateLeadInput){
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO developer_leads
        (id, created_at, name, email, studio, game_title, game_link, pitch, stack, socials, notes, player_ref, ip, user_agent)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id, createdAt, input.name, input.email, input.studio ?? null, input.gameTitle,
        input.gameLink ?? null, input.pitch, input.stack ?? null, input.socials ?? null,
        input.notes ?? null, input.playerRef ?? null, input.ip ?? null, input.userAgent ?? null
      ]
    );
    return { id };
  }
  async listLeads(params?: { limit?: number; offset?: number }){
    const limit = Math.max(1, Math.min(200, params?.limit ?? 50));
    const offset = Math.max(0, params?.offset ?? 0);
    const sorted = [...this.leads].sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
    return { leads: sorted.slice(offset, offset + limit), total: sorted.length };
  }
}
