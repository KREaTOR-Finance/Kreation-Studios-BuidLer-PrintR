import { useEffect, useMemo, useRef, useState } from "react";
import { WsClient, getWsPlayerId, type ServerEvent } from "../../network/wsClient";
import { backendWsUrl } from "../net";

export function useSessionWs(sessionId: string){
  const [connected, setConnected] = useState(false);
  const [connectivity, setConnectivity] = useState<"connecting"|"open"|"closed"|"error">("connecting");

  const wsRef = useRef<WsClient | null>(null);
  const playerId = useMemo(() => getWsPlayerId(), []);

  useEffect(() => {
    if (!sessionId) return;

    let alive = true;
    let backoff = 250;

    const connect = () => {
      if (!alive) return;
      setConnectivity("connecting");

      const ws = new WsClient();
      wsRef.current = ws;
      ws.connect(backendWsUrl(playerId));

      setConnected(false);

      const offStatus = ws.onStatus((s) => {
        if (!alive) return;
        setConnectivity(s.state);
        if (s.state === "open") {
          // subscribe once socket opens
          ws.send({ type: "SESSION_SUBSCRIBE", sessionId, clientTs: Date.now() });
        }
        if (s.state === "closed" || s.state === "error") {
          setConnected(false);
        }
      });

      const off = ws.onEvent((ev: ServerEvent) => {
        if ((ev as any)?.sessionId !== sessionId) return;
        setConnected(true);
        // keep connectivity as reported by socket
      });

      // Watchdog: if no events come in shortly after connect, try reconnect.
      const watchdog = setTimeout(() => {
        if (!alive) return;
        if (!connected) {
          off();
          offStatus();
          ws.close();
          backoff = Math.min(5000, Math.floor(backoff * 1.6));
          setTimeout(connect, backoff);
        }
      }, 5000);

      return () => {
        clearTimeout(watchdog);
        off();
        offStatus();
        ws.close();
      };
    };

    const cleanup = connect();
    return () => {
      alive = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    ws: wsRef,
    connectivity,
    connected,
    playerId
  };
}
