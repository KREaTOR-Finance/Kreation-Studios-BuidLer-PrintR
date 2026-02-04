import type { Express } from "express";
import { z } from "zod";
import { requirePlayerRef, getPlayerRef } from "../middleware/playerRef.js";
import type { RoundsStore } from "../rounds/store.js";
import type { VrfProvider } from "../vrf/provider.js";
import type { AnalyticsStore } from "../analytics/store.js";
import { buildRoundSignaturePayload, markNonceUsed, verifyPlayToken, verifyRoundSignature } from "../security/playTokens.js";
import type { RateLimiter } from "../security/rateLimiter.js";
import type { ReceiptsStore } from "../ledger/receiptsStore.js";

const RoundRequestSchema = z.object({
  roundId: z.string().min(8),
  sessionId: z.string().optional().nullable(),
  tier: z.enum(["SAFE", "BOLD", "LEGEND"]),
  direction: z.enum(["UP", "DOWN"]),
  nonce: z.string().min(6),
  signature: z.string().min(16)
});

const TierConfig = {
  SAFE: { pWin: 0.58, points: 250 },
  BOLD: { pWin: 0.48, points: 450 },
  LEGEND: { pWin: 0.38, points: 800 }
} as const;

export function registerRoundsRoutes(app: Express, args: {
  rounds: RoundsStore;
  vrf: VrfProvider;
  limiter?: RateLimiter;
  analytics?: AnalyticsStore;
  receipts?: ReceiptsStore;
}) {
  const { rounds, vrf, limiter, analytics, receipts } = args;

  app.get("/api/profile", requirePlayerRef, async (req, res) => {
    try {
      const playerRef = getPlayerRef(req);
      const profile = await rounds.getProfile(playerRef);
      return res.json({ ok: true, ...profile });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "PROFILE_FAILED" });
    }
  });

  app.get("/api/rounds/history", requirePlayerRef, async (req, res) => {
    try {
      const playerRef = getPlayerRef(req);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 30)));
      const rows = await rounds.listRounds(playerRef, limit);
      return res.json({ ok: true, rounds: rows });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "HISTORY_FAILED" });
    }
  });

  app.post("/api/rounds/request", requirePlayerRef, async (req, res) => {
    const playerRef = getPlayerRef(req);
    if (limiter && !limiter.allow(`round:${playerRef}`, 12, 60_000)) {
      return res.status(429).json({ error: "RATE_LIMITED" });
    }

    const parsed = RoundRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
    }

    const { roundId, sessionId, tier, direction, nonce, signature } = parsed.data;

    const existing = await rounds.getRound(roundId);
    if (existing) {
      if (existing.playerRef !== playerRef) {
        return res.status(404).json({ error: "ROUND_NOT_FOUND" });
      }
      const profile = await rounds.getProfile(playerRef);
      return res.json({
        ok: true,
        round: existing,
        profile
      });
    }

    const playToken = req.header("x-printr-play-token") ?? "";
    const tokenEntry = playToken ? verifyPlayToken(playToken, playerRef, sessionId ?? null) : null;
    if (!tokenEntry) {
      return res.status(401).json({ error: "INVALID_PLAY_TOKEN" });
    }

    const payload = buildRoundSignaturePayload({ playerRef, sessionId, roundId, nonce, tier, direction });
    if (!verifyRoundSignature(tokenEntry.token, payload, signature)) {
      return res.status(401).json({ error: "BAD_SIGNATURE" });
    }

    if (!markNonceUsed(tokenEntry, nonce)) {
      return res.status(409).json({ error: "REPLAYED_NONCE" });
    }

    const sessionKey = sessionId ?? playerRef;
    const tickIndex = roundIdToTickIndex(roundId);
    const requestedAt = Date.now();
    const { requestId } = await vrf.requestSample(sessionKey, tickIndex);
    const sample = await vrf.waitForSample(requestId);
    const fulfilledAt = Date.now();

    const u = clamp((sample.z + 1) / 2, 0, 1);
    const cfg = TierConfig[tier];
    const win = u < cfg.pWin;
    const pointsDelta = win ? cfg.points : 0;
    const streakDelta = win ? 1 : -1;

    const round = {
      roundId,
      playerRef,
      sessionId: sessionId ?? null,
      tier,
      direction,
      status: win ? "WIN" as const : "MISS" as const,
      pointsDelta,
      streakDelta,
      randomnessHex: sample.proof?.outputHex ?? "",
      z: sample.z,
      requestId: sample.requestId,
      nonce,
      signature,
      proofRef: sample.proofRef ?? null,
      proof: sample.proof ?? null,
      requestedAt,
      fulfilledAt
    };

    try {
      const result = await rounds.recordRound(round);
      if (result.created) {
        receipts?.record({
          playerRef,
          deltaSessions: 0,
          deltaPoints: pointsDelta,
          reason: "round_settlement",
          source: "game",
          externalRef: roundId,
          meta: { tier, direction, status: round.status, requestId: sample.requestId }
        }).catch(() => {});

        analytics?.record({
          playerRef,
          event: "round_settled",
          sessionId: sessionId ?? null,
          meta: {
            roundId,
            tier,
            direction,
            status: round.status,
            pointsDelta,
            streakDelta,
            requestId: sample.requestId
          }
        }).catch(() => {});
      }

      return res.json({
        ok: true,
        round: result.round,
        profile: result.profile
      });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_POINTS") {
        return res.status(402).json({ error: "INSUFFICIENT_POINTS" });
      }
      if (isUniqueViolation(e)) {
        return res.status(409).json({ error: "REPLAYED_NONCE" });
      }
      return res.status(500).json({ error: e?.message ?? "ROUND_FAILED" });
    }
  });
}

function roundIdToTickIndex(roundId: string): number {
  const hex = roundId.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length >= 8) {
    const v = Number.parseInt(hex.slice(0, 8), 16);
    if (Number.isFinite(v)) return v;
  }
  return Date.now();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isUniqueViolation(err: any): boolean {
  const code = err?.code?.toString?.() ?? "";
  if (code === "23505") return true;
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("unique") || msg.includes("constraint");
}
