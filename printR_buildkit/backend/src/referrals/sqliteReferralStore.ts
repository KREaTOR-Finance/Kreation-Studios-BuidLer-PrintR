import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import type { ReferralStore, ReferralTopRow } from "./store.js";

function makeCode(): string {
  // readable, short, uppercase
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `KRE-${hex}`;
}

export class SqliteReferralStore implements ReferralStore {
  private db: Database.Database;

  constructor(dbPath: string){
    this.db = new Database(dbPath);
  }

  migrate(){
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS referrals_users (
        playerRef TEXT PRIMARY KEY,
        referralCode TEXT NOT NULL UNIQUE,
        referredByCode TEXT,
        firstPurchaseAtMs INTEGER
      );

      CREATE TABLE IF NOT EXISTS referrals_referred_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrerCode TEXT NOT NULL,
        referredPlayerRef TEXT NOT NULL,
        usdCents INTEGER NOT NULL,
        bundle TEXT NOT NULL,
        externalRef TEXT,
        createdAtMs INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_referrals_referrerCode ON referrals_referred_purchases(referrerCode);
      CREATE INDEX IF NOT EXISTS idx_referrals_referredPlayerRef ON referrals_referred_purchases(referredPlayerRef);
    `);
  }

  async getOrCreateReferralCode(playerRef: string): Promise<string> {
    const existing = this.db.prepare("SELECT referralCode FROM referrals_users WHERE playerRef=?").get(playerRef) as any;
    if (existing?.referralCode) return String(existing.referralCode);

    // create, handle collisions
    for (let i = 0; i < 10; i++) {
      const code = makeCode();
      try {
        this.db.prepare("INSERT INTO referrals_users(playerRef, referralCode) VALUES(?,?)").run(playerRef, code);
        return code;
      } catch {
        // retry
      }
    }
    throw new Error("REFERRAL_CODE_CREATE_FAILED");
  }

  async applyReferralCode(playerRef: string, referralCode: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const code = referralCode.trim().toUpperCase();
    if (!/^KRE-[0-9A-F]{8}$/.test(code)) return { ok: false, error: "INVALID_CODE" };

    // ensure user row exists
    await this.getOrCreateReferralCode(playerRef);

    const self = this.db.prepare("SELECT referralCode, referredByCode, firstPurchaseAtMs FROM referrals_users WHERE playerRef=?").get(playerRef) as any;
    if (!self) return { ok: false, error: "USER_NOT_FOUND" };
    if (self.firstPurchaseAtMs) return { ok: false, error: "NOT_ELIGIBLE_ALREADY_PURCHASED" };
    if (self.referredByCode) return { ok: false, error: "ALREADY_REFERRED" };
    if (String(self.referralCode) === code) return { ok: false, error: "SELF_REFERRAL" };

    const ref = this.db.prepare("SELECT playerRef FROM referrals_users WHERE referralCode=?").get(code) as any;
    if (!ref?.playerRef) return { ok: false, error: "CODE_NOT_FOUND" };

    this.db.prepare("UPDATE referrals_users SET referredByCode=? WHERE playerRef=?").run(code, playerRef);
    return { ok: true };
  }

  async getReferrerCode(playerRef: string): Promise<string | null> {
    const row = this.db.prepare("SELECT referredByCode FROM referrals_users WHERE playerRef=?").get(playerRef) as any;
    const v = row?.referredByCode ? String(row.referredByCode) : null;
    return v;
  }

  async getPlayerRefByCode(referralCode: string): Promise<string | null> {
    const row = this.db.prepare("SELECT playerRef FROM referrals_users WHERE referralCode=?").get(referralCode.trim().toUpperCase()) as any;
    return row?.playerRef ? String(row.playerRef) : null;
  }

  async markPurchase(playerRef: string, atMs: number): Promise<{ firstPurchase: boolean; referrerCode: string | null }> {
    await this.getOrCreateReferralCode(playerRef);
    const row = this.db.prepare("SELECT firstPurchaseAtMs, referredByCode FROM referrals_users WHERE playerRef=?").get(playerRef) as any;
    const firstPurchase = !row?.firstPurchaseAtMs;
    if (firstPurchase) {
      this.db.prepare("UPDATE referrals_users SET firstPurchaseAtMs=? WHERE playerRef=?").run(atMs, playerRef);
    }
    return { firstPurchase, referrerCode: row?.referredByCode ? String(row.referredByCode) : null };
  }

  async recordReferredPurchase(args: { referredPlayerRef: string; referrerCode: string; usdCents: number; bundle: string; externalRef?: string | null; atMs: number; }): Promise<void> {
    this.db.prepare(
      "INSERT INTO referrals_referred_purchases(referrerCode,referredPlayerRef,usdCents,bundle,externalRef,createdAtMs) VALUES(?,?,?,?,?,?)"
    ).run(args.referrerCode, args.referredPlayerRef, args.usdCents, args.bundle, args.externalRef ?? null, args.atMs);
  }

  async topReferrersByReferredPurchases(limit: number): Promise<ReferralTopRow[]> {
    const rows = this.db.prepare(
      `SELECT referrerCode as referralCode,
              SUM(usdCents) as referredPurchaseUsdCents,
              COUNT(1) as referredPurchaseCount
       FROM referrals_referred_purchases
       GROUP BY referrerCode
       ORDER BY SUM(usdCents) DESC
       LIMIT ?`
    ).all(limit) as any[];

    return rows.map(r => ({
      referralCode: String(r.referralCode),
      referredPurchaseUsdCents: Number(r.referredPurchaseUsdCents ?? 0),
      referredPurchaseCount: Number(r.referredPurchaseCount ?? 0)
    }));
  }
}
