import { randomBytes } from "node:crypto";
import pg from "pg";
import type { ReferralStore, ReferralTopRow } from "./store.js";

function makeCode(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `KRE-${hex}`;
}

export class PostgresReferralStore implements ReferralStore {
  private pool: pg.Pool;
  constructor(databaseUrl: string){
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async migrate(){
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS referrals_users (
        playerRef TEXT PRIMARY KEY,
        referralCode TEXT NOT NULL UNIQUE,
        referredByCode TEXT,
        firstPurchaseAtMs BIGINT
      );

      CREATE TABLE IF NOT EXISTS referrals_referred_purchases (
        id BIGSERIAL PRIMARY KEY,
        referrerCode TEXT NOT NULL,
        referredPlayerRef TEXT NOT NULL,
        usdCents INTEGER NOT NULL,
        bundle TEXT NOT NULL,
        externalRef TEXT,
        createdAtMs BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_referrals_referrerCode ON referrals_referred_purchases(referrerCode);
      CREATE INDEX IF NOT EXISTS idx_referrals_referredPlayerRef ON referrals_referred_purchases(referredPlayerRef);
    `);
  }

  async getOrCreateReferralCode(playerRef: string): Promise<string> {
    const existing = await this.pool.query("SELECT referralCode FROM referrals_users WHERE playerRef=$1", [playerRef]);
    if (existing.rows[0]?.referralcode) return String(existing.rows[0].referralcode);

    for (let i = 0; i < 10; i++) {
      const code = makeCode();
      try {
        await this.pool.query("INSERT INTO referrals_users(playerRef, referralCode) VALUES($1,$2)", [playerRef, code]);
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

    await this.getOrCreateReferralCode(playerRef);

    const selfQ = await this.pool.query("SELECT referralCode, referredByCode, firstPurchaseAtMs FROM referrals_users WHERE playerRef=$1", [playerRef]);
    const self = selfQ.rows[0];
    if (!self) return { ok: false, error: "USER_NOT_FOUND" };
    if (self.firstpurchaseatms) return { ok: false, error: "NOT_ELIGIBLE_ALREADY_PURCHASED" };
    if (self.referredbycode) return { ok: false, error: "ALREADY_REFERRED" };
    if (String(self.referralcode) === code) return { ok: false, error: "SELF_REFERRAL" };

    const refQ = await this.pool.query("SELECT playerRef FROM referrals_users WHERE referralCode=$1", [code]);
    if (!refQ.rows[0]?.playerref) return { ok: false, error: "CODE_NOT_FOUND" };

    await this.pool.query("UPDATE referrals_users SET referredByCode=$1 WHERE playerRef=$2", [code, playerRef]);
    return { ok: true };
  }

  async getReferrerCode(playerRef: string): Promise<string | null> {
    const q = await this.pool.query("SELECT referredByCode FROM referrals_users WHERE playerRef=$1", [playerRef]);
    return q.rows[0]?.referredbycode ? String(q.rows[0].referredbycode) : null;
  }

  async getPlayerRefByCode(referralCode: string): Promise<string | null> {
    const q = await this.pool.query("SELECT playerRef FROM referrals_users WHERE referralCode=$1", [referralCode.trim().toUpperCase()]);
    return q.rows[0]?.playerref ? String(q.rows[0].playerref) : null;
  }

  async markPurchase(playerRef: string, atMs: number): Promise<{ firstPurchase: boolean; referrerCode: string | null }> {
    await this.getOrCreateReferralCode(playerRef);
    const q = await this.pool.query("SELECT firstPurchaseAtMs, referredByCode FROM referrals_users WHERE playerRef=$1", [playerRef]);
    const row = q.rows[0];
    const firstPurchase = !row?.firstpurchaseatms;
    if (firstPurchase) {
      await this.pool.query("UPDATE referrals_users SET firstPurchaseAtMs=$1 WHERE playerRef=$2", [atMs, playerRef]);
    }
    return { firstPurchase, referrerCode: row?.referredbycode ? String(row.referredbycode) : null };
  }

  async recordReferredPurchase(args: { referredPlayerRef: string; referrerCode: string; usdCents: number; bundle: string; externalRef?: string | null; atMs: number; }): Promise<void> {
    await this.pool.query(
      "INSERT INTO referrals_referred_purchases(referrerCode,referredPlayerRef,usdCents,bundle,externalRef,createdAtMs) VALUES($1,$2,$3,$4,$5,$6)",
      [args.referrerCode, args.referredPlayerRef, args.usdCents, args.bundle, args.externalRef ?? null, args.atMs]
    );
  }

  async topReferrersByReferredPurchases(limit: number): Promise<ReferralTopRow[]> {
    const q = await this.pool.query(
      `SELECT referrerCode as referralCode,
              SUM(usdCents) as referredPurchaseUsdCents,
              COUNT(1) as referredPurchaseCount
       FROM referrals_referred_purchases
       GROUP BY referrerCode
       ORDER BY SUM(usdCents) DESC
       LIMIT $1`,
      [limit]
    );

    return q.rows.map(r => ({
      referralCode: String(r.referralcode ?? r.referralCode),
      referredPurchaseUsdCents: Number(r.referredpurchaseusdcents ?? r.referredPurchaseUsdCents ?? 0),
      referredPurchaseCount: Number(r.referredpurchasecount ?? r.referredPurchaseCount ?? 0)
    }));
  }
}
