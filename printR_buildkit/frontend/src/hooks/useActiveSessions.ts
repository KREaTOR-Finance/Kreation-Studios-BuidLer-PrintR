import { useCallback, useEffect, useState } from "react";
import { apiGet, type PlayerHeaders } from "../network/httpClient";

export type ActiveSession = {
  sessionId: string;
  mode: "play" | "spectate";
  phase: "LIVE" | "FINAL_COMMIT_WARNING" | "CLOSING" | "ENDED";
  assetName: string;
  price: number;
  tickIndex: number;
  activePlayers?: number;
  endTimeMs: number;
  closingTimeMs: number;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
};

export function useActiveSessions(player: PlayerHeaders | null) {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerRef = player?.playerRef ?? null;
  const walletPubkey = player?.walletPubkey ?? null;

  const refresh = useCallback(async () => {
    if (!playerRef) {
      setActiveSessions([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<ActiveSession[]>("/api/sessions/active", { playerRef, walletPubkey });
      setActiveSessions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "active_sessions_error");
    } finally {
      setLoading(false);
    }
  }, [playerRef, walletPubkey]);

  useEffect(() => {
    refresh();
    if (!playerRef) return;
    const id = window.setInterval(refresh, 7000);
    return () => window.clearInterval(id);
  }, [playerRef, refresh]);

  return { activeSessions, loading, error, refresh };
}
