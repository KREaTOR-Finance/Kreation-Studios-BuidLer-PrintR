import { useEffect, useState } from "react";
import { apiGet, type PlayerHeaders } from "../network/httpClient";

export function useCreditsBalance(player: PlayerHeaders | null) {
  const [sessionsBalance, setBal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!player) return;
    try {
      setError(null);
      const r = await apiGet<{ playerRef: string; sessionsBalance: number }>(`/api/credits/balance`, player);
      setBal(r.sessionsBalance);
    } catch (e: any) {
      setError(e?.message ?? "balance_error");
    }
  }

  useEffect(() => { refresh(); }, [player?.playerRef, player?.walletPubkey]);

  return { sessionsBalance, error, refresh };
}
