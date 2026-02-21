import { getPlayerRef, requirePlayerRef } from "../middleware/playerRef.js";
import { BundleToSessions, createCheckoutUrl } from "../payments/stripe.js";
export function registerPaymentsRoutes(app, analytics) {
    app.post("/api/payments/stripe/checkout", requirePlayerRef, async (req, res) => {
        try {
            const playerRef = getPlayerRef(req);
            const bundle = (req.body?.bundle ?? "BUNDLE_10");
            if (bundle !== "BUNDLE_10" && bundle !== "BUNDLE_100" && bundle !== "RESET_POINTS") {
                return res.status(400).json({ ok: false, error: "invalid_bundle" });
            }
            const successUrl = process.env.STRIPE_SUCCESS_URL ?? "https://example.com/success";
            const cancelUrl = process.env.STRIPE_CANCEL_URL ?? "https://example.com/cancel";
            const { url, sessionId } = await createCheckoutUrl({ playerRef, bundle, successUrl, cancelUrl });
            analytics?.record({
                playerRef,
                event: "checkout_created",
                sessionId: null,
                meta: { bundle, sessionId }
            }).catch(() => { });
            return res.json({
                ok: true,
                url,
                checkoutUrl: url,
                sessionId,
                bundle,
                sessions: BundleToSessions[bundle]
            });
        }
        catch (e) {
            return res.status(500).json({ ok: false, error: e?.message ?? "stripe_checkout_error" });
        }
    });
}
