import type { Express } from "express";
import type { SessionRuntime } from "../engine/models.js";
import type { SessionSeedSwitchboardProvider } from "../vrf/sessionSeedSwitchboardProvider.js";

/**
 * Public proof endpoints.
 *
 * Provides:
 * - Commitment hash (always)
 * - Switchboard tx/account refs + outputHex (always, once initialized)
 * - Revealed server secret (only after session ends)
 */
export function registerProofRoutes(app: Express, args: {
  sessions: Map<string, SessionRuntime>;
  sessionVrf: SessionSeedSwitchboardProvider | null;
}) {
  const { sessions, sessionVrf } = args;

  app.get("/api/sessions/:sessionId/proof", async (req, res) => {
    const sessionId = String(req.params.sessionId ?? "");
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "SESSION_NOT_FOUND" });

    if (!sessionVrf) {
      return res.json({
        ok: true,
        sessionId,
        status: session.phase === "ENDED" ? "REVEALED" : "PENDING_REVEAL",
        mode: "DEV",
        note: "Switchboard per-session VRF is disabled (USE_SWITCHBOARD_VRF not true)."
      });
    }

    // Ensure initialized so the commitment/proof bundle exists.
    try {
      await sessionVrf.ensureSession(sessionId);
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "VRF_INIT_FAILED" });
    }

    const pub = sessionVrf.getPublic(sessionId);
    if (!pub) return res.status(500).json({ ok: false, error: "VRF_STATE_MISSING" });

    const ended = session.phase === "ENDED";

    const reveal = ended ? sessionVrf.revealSession(sessionId) : null;

    return res.json({
      ok: true,
      sessionId,
      status: ended ? "REVEALED" : "PENDING_REVEAL",
      commitment: pub.commitment,
      vrf: pub.vrf,
      reveal: reveal ? { serverSecretHex: reveal.serverSecretHex } : undefined,
      // Replay parameters (verifier needs these)
      session: {
        startTimeMs: session.startTimeMs,
        endTimeMs: session.endTimeMs,
        closingTimeMs: session.closingTimeMs,
        tickIntervalMs: 5000,
        assetName: session.assetName,
        supply: session.supply,
        marketIndex: session.marketIndex,
        archetype: session.archetype,
        initialPrice: session.tickHistory?.[0]?.price ?? session.price
      }
    });
  });
}
