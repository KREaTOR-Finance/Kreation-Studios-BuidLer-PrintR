import type { Express } from "express";

import { getPlayerRef, requirePlayerRef } from "../middleware/playerRef.js";
import { BundleToSessions, createCheckoutUrl, type StripeBundle } from "../payments/stripe.js";
import type { ReferralStore } from "../referrals/store.js";
import type { AnalyticsStore } from "../analytics/store.js";

export function registerPaymentsRoutes(app: Express, analytics?: AnalyticsStore, referrals?: ReferralStore) {
  app.post("/api/payments/stripe/checkout", requirePlayerRef, async (req, res) => {
    try {
      const playerRef = getPlayerRef(req);
      const bundle = (req.body?.bundle ?? "BUNDLE_5") as StripeBundle;
      if (bundle !== "BUNDLE_1" && bundle !== "BUNDLE_5" && bundle !== "BUNDLE_15" && bundle !== "BUNDLE_99" && bundle !== "RESET_POINTS") {
        return res.status(400).json({ ok: false, error: "invalid_bundle" });
      }

      const successUrl = process.env.STRIPE_SUCCESS_URL ?? "https://example.com/success";
      const cancelUrl = process.env.STRIPE_CANCEL_URL ?? "https://example.com/cancel";

      // Optional referral code (only applied pre-first-purchase)
      const referralCode = typeof req.body?.referralCode === "string" ? String(req.body.referralCode) : "";
      if (referrals && referralCode) {
        await referrals.applyReferralCode(playerRef, referralCode).catch(() => {});
      }

      const referrerCode = referrals ? await referrals.getReferrerCode(playerRef).catch(() => null) : null;
      const discountPct = referrerCode ? 50 : 0;

      const { url, sessionId } = await createCheckoutUrl({
        playerRef,
        bundle,
        successUrl,
        cancelUrl,
        discountPct,
        referralCodeUsed: referrerCode
      });
      analytics?.record({
        playerRef,
        event: "checkout_created",
        sessionId: null,
        meta: { bundle, sessionId }
      }).catch(() => {});

      return res.json({
        ok: true,
        url,
        checkoutUrl: url,
        sessionId,
        bundle,
        sessions: BundleToSessions[bundle]
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "stripe_checkout_error" });
    }
  });
}
