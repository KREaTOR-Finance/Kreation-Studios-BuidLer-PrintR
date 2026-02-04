import { useCallback, useEffect, useState } from "react";
import { apiGet, type PlayerHeaders } from "../network/httpClient";

export function useCreditsBalance(player: PlayerHeaders | null) {
  const [sessionsBalance, setBal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const playerRef = player?.playerRef ?? null;
  const walletPubkey = player?.walletPubkey ?? null;

  const refresh = useCallback(async () => {
    if (!playerRef) {
      setBal(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await apiGet<{ playerRef: string; sessionsBalance: number }>(`/api/credits/balance`, {
        playerRef,
        walletPubkey
      });
      setBal(r.sessionsBalance);
    } catch (e: any) {
      setError(e?.message ?? "balance_error");
    } finally {
      setLoading(false);
    }
  }, [playerRef, walletPubkey]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!playerRef) return;
    const handleFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [playerRef, refresh]);

  return { sessionsBalance, error, loading, refresh };
}
