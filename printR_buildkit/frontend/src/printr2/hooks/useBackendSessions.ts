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

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const res = await fetch(`${backendHttpBase()}/sessions`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        const j = await res.json();
        if (!alive) return;
        setItems(Array.isArray(j) ? j : []);
        setStatus("ok");
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setStatus("error");
        setError(e?.message ?? "FAILED_TO_FETCH");
      }
    };

    run();
    const t = setInterval(run, 2500);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return { items, status, error };
}
