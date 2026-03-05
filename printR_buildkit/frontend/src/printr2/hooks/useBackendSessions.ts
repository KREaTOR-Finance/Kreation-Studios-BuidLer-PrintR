import { useEffect, useState } from "react";
import { backendHttpBase } from "../net";

type SessionItem = {
  id: string;
  assetName: string;
  phase: string;
  price: number;
  tickIndex: number;
  endTimeMs: number;
  closingTimeMs: number;
  marketIndex: number;
  supply: number;
  archetype: string;
};

export function useBackendSessions(){
  const [items, setItems] = useState<SessionItem[]>([]);
  const [status, setStatus] = useState<"ok"|"loading"|"error">("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const base = (typeof window !== "undefined" && window.location.port === "3001") ? "" : backendHttpBase();
      const res = await fetch(`${base}/sessions`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const j = await res.json();
      setItems(Array.isArray(j) ? j : []);
      setStatus("ok");
      setError(null);
    } catch (e: any) {
      setStatus("error");
      setError(e?.message ?? "FAILED_TO_FETCH");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await refresh(); })();
    const t = setInterval(() => { if (alive) void refresh(); }, 2500);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, status, error, refresh };
}
