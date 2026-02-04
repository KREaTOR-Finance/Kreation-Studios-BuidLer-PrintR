import { useEffect, useState } from "react";
import type { WsClient, ServerEvent } from "../network/wsClient";

export function useSessionFeed(ws: WsClient, sessionId: string) {
  const [ticks, setTicks] = useState<Array<{ t: number; price: number }>>([]);
  const [hud, setHud] = useState<any>(null);
  const [lastVrf, setLastVrf] = useState<any>(null);

  useEffect(() => {
    const handler = (ev: ServerEvent) => {
      if (ev.sessionId !== sessionId) return;
      if (ev.type === "TICK") { setTicks(prev => [...prev.slice(-500), { t: Date.now(), price: ev.price }]); setLastVrf(ev.vrf); }
      if (ev.type === "PLAYER_HUD") setHud(ev);
    };
    ws.onEvent(handler);
  }, [ws, sessionId]);

  return { ticks, hud, lastVrf };
}
