import type { Express } from "express";
import { requirePlayerRef, getPlayerRef } from "../middleware/playerRef.js";
import type { ReferralStore } from "../referrals/store.js";

export function registerReferralRoutes(app: Express, referrals: ReferralStore){
  app.get("/api/referrals/me", requirePlayerRef, async (req, res) => {
    try {
      const playerRef = getPlayerRef(req);
      const code = await referrals.getOrCreateReferralCode(playerRef);
      return res.json({ ok: true, referralCode: code });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "REFERRAL_ME_FAILED" });
    }
  });

  app.post("/api/referrals/apply", requirePlayerRef, async (req, res) => {
    try {
      const playerRef = getPlayerRef(req);
      const code = String(req.body?.code ?? "");
      const out = await referrals.applyReferralCode(playerRef, code);
      if (!out.ok) return res.status(400).json({ ok: false, error: out.error });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "REFERRAL_APPLY_FAILED" });
    }
  });

  // Public top 20
  app.get("/api/public/referrals/top", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));
      const rows = await referrals.topReferrersByReferredPurchases(limit);
      return res.json({ ok: true, rows });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "TOP_FAILED" });
    }
  });
}
