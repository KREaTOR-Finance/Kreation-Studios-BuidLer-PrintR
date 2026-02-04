import type { Express } from "express";

import type { SessionRuntime } from "../engine/models.js";
import { getPlayerRef, requirePlayerRef } from "../middleware/playerRef.js";
import { issuePlayToken } from "../security/playTokens.js";
import type { EntitlementsStore } from "../sessions/entitlementsStore.js";

type SessionPhase = "LIVE" | "FINAL_COMMIT_WARNING" | "CLOSING" | "ENDED";

function derivePhase(session: SessionRuntime, now: number): SessionPhase {
  if (now >= session.endTimeMs) return "ENDED";
  if (now >= session.closingTimeMs) return "CLOSING";
  if (now >= session.closingTimeMs - 30_000) return "FINAL_COMMIT_WARNING";
  return "LIVE";
}

export function registerSessionRoutes(app: Express, args: {
  sessions: Map<string, SessionRuntime>;
  entitlements: EntitlementsStore;
  playTokenTtlMs?: number;
  resumeGraceMs?: number;
}) {
  const { sessions, entitlements } = args;
  const fallbackTtl = 60 * 60 * 1000;
  const envTtl = Number(process.env.PLAY_TOKEN_TTL_MS ?? fallbackTtl);
  const playTokenTtlMs = Number.isFinite(args.playTokenTtlMs)
    ? args.playTokenTtlMs!
    : (Number.isFinite(envTtl) ? envTtl : fallbackTtl);
  const resumeGraceMs = Number.isFinite(args.resumeGraceMs)
    ? args.resumeGraceMs!
    : Number(process.env.SESSION_RESUME_GRACE_MS ?? 10 * 60_000);

  app.get("/api/sessions/active", requirePlayerRef, async (req, res) => {
    const playerRef = getPlayerRef(req);
    const now = Date.now();
    const items = await entitlements.list(playerRef);
    const active = items
      .filter((ent) => ent.expiresAt > now)
      .map((ent) => {
        const session = sessions.get(ent.sessionId);
        if (!session) return null;
        const phase = derivePhase(session, now);
        if (phase === "ENDED") return null;
        return {
          sessionId: ent.sessionId,
          mode: ent.mode,
          phase,
          assetName: session.assetName,
          price: session.price,
          tickIndex: session.tickIndex,
          activePlayers: session.activePlayers,
          endTimeMs: session.endTimeMs,
          closingTimeMs: session.closingTimeMs,
          createdAt: ent.createdAt,
          lastSeenAt: ent.lastSeenAt,
          expiresAt: ent.expiresAt
        };
      })
      .filter(Boolean);
    return res.json(active);
  });

  app.post("/api/sessions/:sessionId/resume", requirePlayerRef, async (req, res) => {
    const playerRef = getPlayerRef(req);
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    const now = Date.now();
    const ent = await entitlements.get(playerRef, sessionId);
    if (!ent || ent.expiresAt <= now) {
      if (ent) await entitlements.remove(playerRef, sessionId);
      return res.status(404).json({ error: "SESSION_NOT_ACTIVE" });
    }

    const phase = derivePhase(session, now);
    if (phase === "ENDED") {
      await entitlements.remove(playerRef, sessionId);
      return res.status(409).json({ error: "SESSION_ENDED" });
    }

    const updated = await entitlements.upsert({
      ...ent,
      lastSeenAt: now,
      expiresAt: session.endTimeMs + resumeGraceMs
    });

    const token = updated.mode === "play"
      ? issuePlayToken(playerRef, sessionId, playTokenTtlMs)
      : null;

    return res.json({
      join: updated.mode,
      sessionId,
      phase,
      playToken: token?.token ?? undefined,
      playTokenExpiresAt: token?.expiresAt ?? undefined
    });
  });

  app.post("/api/sessions/:sessionId/leave", requirePlayerRef, async (req, res) => {
    const playerRef = getPlayerRef(req);
    const sessionId = req.params.sessionId;
    await entitlements.remove(playerRef, sessionId);
    return res.json({ ok: true });
  });
}
