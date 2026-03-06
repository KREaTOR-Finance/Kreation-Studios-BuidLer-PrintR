import type { Express } from "express";

import type { CreditsStore } from "../credits/store.js";
import type { SessionRuntime } from "../engine/models.js";
import { requireAuth, type AuthedRequest, getWallet } from "../middleware/auth.js";
import { issuePlayToken } from "../security/playTokens.js";
import type { ReceiptsStore } from "../ledger/receiptsStore.js";
import type { AnalyticsStore } from "../analytics/store.js";
import type { RateLimiter } from "../security/rateLimiter.js";
import type { EntitlementsStore } from "../sessions/entitlementsStore.js";

export function registerCreditsRoutes(
  app: Express,
  args: {
    credits: CreditsStore;
    sessions: Map<string, SessionRuntime>;
    entitlements?: EntitlementsStore;
    receipts?: ReceiptsStore;
    analytics?: AnalyticsStore;
    limiter?: RateLimiter;
    playTokenTtlMs?: number;
    resumeGraceMs?: number;
    onJoinPlay?: (info: { playerRef: string; sessionId: string; playerId?: string }) => void;
  }
) {
  const { credits, sessions, entitlements, receipts, analytics, limiter } = args;
  const fallbackTtl = 60 * 60 * 1000;
  const envTtl = Number(process.env.PLAY_TOKEN_TTL_MS ?? fallbackTtl);
  const playTokenTtlMs = Number.isFinite(args.playTokenTtlMs)
    ? args.playTokenTtlMs!
    : (Number.isFinite(envTtl) ? envTtl : fallbackTtl);
  const resumeGraceMs = Number.isFinite(args.resumeGraceMs)
    ? args.resumeGraceMs!
    : Number(process.env.SESSION_RESUME_GRACE_MS ?? 10 * 60_000);

  app.get("/api/credits/balance", requireAuth, async (req, res) => {
    const wallet = getWallet(req as any);
    const sessionsBalance = await credits.getBalance(wallet);
    return res.json({ wallet, sessionsBalance });
  });

  app.post("/api/sessions/:sessionId/join", requireAuth, async (req, res) => {
    const wallet = getWallet(req as any);
    const playerId = typeof (req.body as any)?.playerId === "string" ? String((req.body as any).playerId) : undefined;
    if (limiter && !limiter.allow(`join:${wallet}`, 12, 60_000)) {
      return res.status(429).json({ error: "RATE_LIMITED" });
    }

    const sessionId = req.params.sessionId;
    const s = sessions.get(sessionId);
    if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    const now = Date.now();
    const phase = now >= s.endTimeMs
      ? "ENDED"
      : (now >= s.closingTimeMs
        ? "CLOSING"
        : (now >= s.closingTimeMs - 30_000 ? "FINAL_COMMIT_WARNING" : "LIVE"));

    if (phase === "CLOSING") {
      const sessionsBalance = await credits.getBalance(wallet);
      if (entitlements) {
        await entitlements.upsert({
          playerRef: wallet,
          sessionId,
          mode: "spectate",
          createdAt: now,
          lastSeenAt: now,
          expiresAt: s.endTimeMs + resumeGraceMs
        });
      }
      console.info("join_spectate", { wallet, sessionId, phase, sessionsBalance });
      return res.json({ join: "spectate", sessionId, phase, sessionsBalance });
    }
    if (phase !== "LIVE" && phase !== "FINAL_COMMIT_WARNING") {
      console.warn("join_not_joinable", { wallet, sessionId, phase });
      return res.status(409).json({ error: "SESSION_NOT_JOINABLE" });
    }

    const idem = req.header("Idempotency-Key") ?? "";
    const consume = await credits.consumeOneSession(wallet, sessionId, idem);
    if (!consume.ok) {
      if (consume.reason === "DUPLICATE") {
        const sessionsBalance = await credits.getBalance(wallet);
        const token = issuePlayToken(wallet, sessionId, playTokenTtlMs);
        if (entitlements) {
          await entitlements.upsert({
            playerRef: wallet,
            sessionId,
            mode: "play",
            createdAt: now,
            lastSeenAt: now,
            expiresAt: s.endTimeMs + resumeGraceMs
          });
        }
        args.onJoinPlay?.({ playerRef: wallet, sessionId, playerId });
        console.info("join_duplicate", { wallet, sessionId, sessionsBalance });
        return res.json({
          join: "play",
          sessionId,
          phase,
          sessionsBalance,
          playToken: token.token,
          playTokenExpiresAt: token.expiresAt
        });
      }

      const sessionsBalance = await credits.getBalance(wallet);
      if (entitlements) {
        await entitlements.upsert({
          playerRef: wallet,
          sessionId,
          mode: "spectate",
          createdAt: now,
          lastSeenAt: now,
          expiresAt: s.endTimeMs + resumeGraceMs
        });
      }
      console.warn("join_denied_insufficient", { wallet, sessionId, sessionsBalance });
      return res.json({ join: "spectate", sessionId, phase, sessionsBalance });
    }

    receipts?.record({
      playerRef: wallet,
      deltaSessions: -1,
      deltaPoints: 0,
      reason: "session_join",
      source: "game",
      externalRef: sessionId,
      meta: { phase, idempotencyKey: idem || null }
    }).catch(() => {});

    analytics?.record({
      playerRef: wallet,
      event: "session_joined",
      sessionId,
      meta: { phase }
    }).catch(() => {});

    const token = issuePlayToken(wallet, sessionId, playTokenTtlMs);
    if (entitlements) {
      await entitlements.upsert({
        playerRef: wallet,
        sessionId,
        mode: "play",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: s.endTimeMs + resumeGraceMs
      });
    }
    args.onJoinPlay?.({ playerRef: wallet, sessionId, playerId });

    console.info("credit_consumed", { wallet, sessionId, phase, sessionsBalance: consume.balance });
    return res.json({
      join: "play",
      sessionId,
      phase,
      sessionsBalance: consume.balance,
      playToken: token.token,
      playTokenExpiresAt: token.expiresAt
    });
  });
}
