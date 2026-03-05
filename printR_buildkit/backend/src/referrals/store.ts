export type ReferralTopRow = {
  referralCode: string;
  referredPurchaseUsdCents: number;
  referredPurchaseCount: number;
};

export interface ReferralStore {
  migrate?: () => void | Promise<void>;

  /** Get or create a user's referral code. */
  getOrCreateReferralCode(playerRef: string): Promise<string>;

  /** Apply a referral code to a player (only once, only pre-first-purchase). */
  applyReferralCode(playerRef: string, referralCode: string): Promise<{ ok: true } | { ok: false; error: string }>;

  getReferrerCode(playerRef: string): Promise<string | null>;
  getPlayerRefByCode(referralCode: string): Promise<string | null>;

  /** Mark purchase and record whether this was the first purchase at time of processing. */
  markPurchase(playerRef: string, atMs: number): Promise<{ firstPurchase: boolean; referrerCode: string | null }>;

  /** Record referred user's purchase volume for leaderboard. */
  recordReferredPurchase(args: {
    referredPlayerRef: string;
    referrerCode: string;
    usdCents: number;
    bundle: string;
    externalRef?: string | null;
    atMs: number;
  }): Promise<void>;

  topReferrersByReferredPurchases(limit: number): Promise<ReferralTopRow[]>;
}
