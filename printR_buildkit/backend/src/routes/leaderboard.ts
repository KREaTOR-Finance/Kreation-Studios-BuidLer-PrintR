import type { Express } from "express";
import type { ResultsStore } from "../leaderboard/resultsStore.js";

export function registerLeaderboardRoutes(app: Express, results: ResultsStore) {
  // Per-session leaderboard
  app.get("/api/leaderboard/session/:sessionId", async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId ?? "");
      const rows = await results.listSession(sessionId);
      return res.json({ ok: true, sessionId, rows });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "LEADERBOARD_ERROR" });
    }
  });

  // All-time grindy leaderboard (sum of all session results)
  app.get("/api/leaderboard/all", async (_req, res) => {
    try {
      const rows = await results.sumAllTime();
      return res.json({ ok: true, scope: "all", rows });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "LEADERBOARD_ERROR" });
    }
  });
}
