import { useEffect, useMemo, useRef, useState } from "react";
import { WsClient, getWsPlayerId, type ServerEvent } from "../../network/wsClient";
import { backendWsUrl } from "../net";

export function useSessionWs(sessionId: string){
  const [connected, setConnected] = useState(false);
  const [connectivity, setConnectivity] = useState<"connecting"|"open"|"closed"|"error">("connecting");

  const wsRef = useRef<WsClient | null>(null);
  const playerId = useMemo(() => getWsPlayerId(), []);

  const lastEventAtRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let alive = true;
    let backoff = 250;

    const clearReconnect = () => {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!alive) return;
      clearReconnect();
      const delay = backoff;
      backoff = Math.min(5000, Math.floor(backoff * 1.6));
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay) as any;
    };

    const connect = () => {
      if (!alive) return;
      clearReconnect();

      setConnectivity("connecting");
      setConnected(false);

      const ws = new WsClient();
      wsRef.current = ws;
      ws.connect(backendWsUrl(playerId));

      const offStatus = ws.onStatus((s) => {
        if (!alive) return;
        setConnectivity(s.state);

        if (s.state === "open") {
          backoff = 250; // reset backoff on healthy connect
          ws.send({ type: "SESSION_SUBSCRIBE", sessionId, clientTs: Date.now() });
        }

        if (s.state === "closed" || s.state === "error") {
          setConnected(false);
          scheduleReconnect();
        }
      });

      const off = ws.onEvent((ev: ServerEvent) => {
        if ((ev as any)?.sessionId !== sessionId) return;
        lastEventAtRef.current = Date.now();
        setConnected(true);
      });

      // Watchdog: if we go quiet, resub/reconnect.
      const watchdog = window.setInterval(() => {
        if (!alive) return;
        const age = Date.now() - (lastEventAtRef.current || 0);
        // if socket says open but we haven't gotten events in a while, resub then reconnect
        if (wsRef.current === ws && (ws as any) && age > 8000) {
          try { ws.send({ type: "SESSION_SUBSCRIBE", sessionId, clientTs: Date.now() }); } catch {}
        }
        if (age > 15000) {
          try { ws.close(); } catch {}
        }
      }, 3000);

      return () => {
        window.clearInterval(watchdog);
        off();
        offStatus();
        try { ws.close(); } catch {}
      };
    };

    const cleanup = connect();
    return () => {
      alive = false;
      clearReconnect();
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
