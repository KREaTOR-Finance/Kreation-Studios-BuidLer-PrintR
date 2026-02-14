import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
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
        walletPubkey,
      });
      setBal(r.sessionsBalance);
    } catch (e: any) {
      setError(e?.message ?? "balance_error");
    } finally {
      setLoading(false);
    }
  }, [playerRef, walletPubkey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!playerRef) return;
    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === "active") refresh();
    };
    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  }, [playerRef, refresh]);

  return { sessionsBalance, error, loading, refresh };
}
