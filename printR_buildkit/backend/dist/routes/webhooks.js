import express from "express";
import { BundleToSessions, extractCheckoutCompleted, verifyStripeWebhook } from "../payments/stripe.js";
export function registerWebhookRoutes(app, args) {
    const { credits, rounds, prizes, receipts, analytics } = args;
    app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
        try {
            const event = verifyStripeWebhook(req);
            const parsed = extractCheckoutCompleted(event);
            // Always ack quickly for non-target events.
            if (!parsed) {
                console.info("stripe_webhook_ignored", { eventId: event.id, type: event.type });
                return res.status(200).json({ ok: true });
            }
            // Idempotency: record event id if store supports it (SQLite does).
            const recorded = credits.recordWebhookEvent ? await credits.recordWebhookEvent("stripe", event.id) : true;
            if (!recorded) {
                console.info("stripe_webhook_duplicate", { eventId: event.id });
                return res.status(200).json({ ok: true, duplicate: true });
            }
            if (parsed.bundle === "RESET_POINTS") {
                if (!rounds) {
                    return res.status(500).json({ ok: false, error: "points_reset_not_configured" });
                }
                const before = await rounds.getProfile(parsed.playerRef);
                const prevPoints = Math.max(0, Number(before.points ?? 0));
                if (prevPoints > 0) {
                    await rounds.resetPoints(parsed.playerRef);
                    if (prizes)
                        await prizes.resetPoints(parsed.playerRef);
                }
                receipts?.record({
                    playerRef: parsed.playerRef,
                    deltaSessions: 0,
                    deltaPoints: prevPoints > 0 ? -prevPoints : 0,
                    reason: "points_reset",
                    source: "stripe",
                    externalRef: parsed.externalRef,
                    meta: { bundle: parsed.bundle, eventId: event.id, prevPoints }
                }).catch(() => { });
                analytics?.record({
                    playerRef: parsed.playerRef,
                    event: "points_reset_purchased",
                    sessionId: null,
                    meta: { bundle: parsed.bundle, prevPoints, checkoutSessionId: parsed.externalRef }
                }).catch(() => { });
                console.info("stripe_webhook_points_reset", {
                    eventId: event.id,
                    playerRef: parsed.playerRef,
                    bundle: parsed.bundle,
                    prevPoints
                });
                return res.status(200).json({ ok: true });
            }
            const sessions = BundleToSessions[parsed.bundle];
            await credits.addLedger({
                playerRef: parsed.playerRef,
                deltaSessions: sessions,
                reason: "purchase",
                source: "stripe",
                externalRef: parsed.externalRef,
                idempotencyKey: event.id,
                meta: { bundle: parsed.bundle, checkoutSessionId: parsed.externalRef, eventId: event.id }
            });
            receipts?.record({
                playerRef: parsed.playerRef,
                deltaSessions: sessions,
                deltaPoints: 0,
                reason: "credits_purchase",
                source: "stripe",
                externalRef: parsed.externalRef,
                meta: { bundle: parsed.bundle, eventId: event.id }
            }).catch(() => { });
            analytics?.record({
                playerRef: parsed.playerRef,
                event: "credits_purchased",
                sessionId: null,
                meta: { bundle: parsed.bundle, sessions, checkoutSessionId: parsed.externalRef }
            }).catch(() => { });
            console.info("stripe_webhook_credited", {
                eventId: event.id,
                playerRef: parsed.playerRef,
                bundle: parsed.bundle,
                sessions
            });
            return res.status(200).json({ ok: true });
        }
        catch (e) {
            return res.status(400).json({ ok: false, error: e?.message ?? "webhook_error" });
        }
    });
}
