import { requirePlayerRef, getPlayerRef } from "../middleware/playerRef.js";
import { PRIZE_CATALOG } from "../prizes/catalog.js";
export function registerPrizesRoutes(app, args) {
    const { prizes, receipts, analytics, limiter } = args;
    app.get("/api/prizes", requirePlayerRef, async (req, res) => {
        try {
            const playerRef = getPlayerRef(req);
            const profile = await prizes.getProfile(playerRef);
            const claims = await prizes.listClaims(playerRef);
            const claimMap = new Map(claims.map(c => [c.prizeId, c]));
            const items = PRIZE_CATALOG.map((p) => {
                const claim = claimMap.get(p.id);
                const status = claim ? "CLAIMED" : (profile.points >= p.costPoints ? "CLAIMABLE" : "LOCKED");
                return {
                    ...p,
                    status,
                    claimId: claim?.id ?? null,
                    claimStatus: claim?.status ?? null,
                    claimedAt: claim?.createdAt ?? null
                };
            });
            return res.json({ ok: true, profile, prizes: items });
        }
        catch (e) {
            return res.status(500).json({ ok: false, error: e?.message ?? "PRIZES_FAILED" });
        }
    });
    app.post("/api/prizes/:prizeId/claim", requirePlayerRef, async (req, res) => {
        const playerRef = getPlayerRef(req);
        if (limiter && !limiter.allow(`prize:${playerRef}`, 6, 60_000)) {
            return res.status(429).json({ error: "RATE_LIMITED" });
        }
        const prizeId = String(req.params.prizeId || "");
        const prize = PRIZE_CATALOG.find(p => p.id === prizeId);
        if (!prize)
            return res.status(404).json({ error: "PRIZE_NOT_FOUND" });
        try {
            const result = await prizes.claimPrize(playerRef, prizeId, prize.costPoints);
            receipts?.record({
                playerRef,
                deltaSessions: 0,
                deltaPoints: -prize.costPoints,
                reason: "prize_claim",
                source: "prize",
                externalRef: prizeId,
                meta: { claimId: result.claim.id, prizeId }
            }).catch(() => { });
            analytics?.record({
                playerRef,
                event: "prize_claimed",
                sessionId: null,
                meta: { prizeId, costPoints: prize.costPoints, claimId: result.claim.id }
            }).catch(() => { });
            return res.json({ ok: true, claim: result.claim, profile: result.profile });
        }
        catch (e) {
            if (e?.message === "INSUFFICIENT_POINTS") {
                return res.status(402).json({ error: "INSUFFICIENT_POINTS" });
            }
            return res.status(500).json({ error: e?.message ?? "CLAIM_FAILED" });
        }
    });
}
