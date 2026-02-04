import { useEffect, useRef, useState } from "react";
import type { WsClient, ServerEvent } from "../network/wsClient";
import { API_BASE } from "../network/httpClient";
import { logError } from "../utils/errorLogger";

export function useSessionFeed(ws: WsClient | null, sessionId?: string | null) {
  const [ticks, setTicks] = useState<Array<{ t: number; price: number; tickIndex: number }>>([]);
  const [hud, setHud] = useState<any>(null);
  const [lastVrf, setLastVrf] = useState<any>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const lastTickAt = useRef(0);
  const lastTickIndex = useRef<number | null>(null);
  const timeBaseMs = useRef<number | null>(null);

  useEffect(() => {
    setTicks([]);
    setHud(null);
    setLastVrf(null);
    setSessionState(null);
    lastTickAt.current = 0;
    lastTickIndex.current = null;
    timeBaseMs.current = null;
  }, [sessionId]);

  const applyTick = (tickIndex: number, price: number) => {
    if (!Number.isFinite(tickIndex)) return;
    const base = timeBaseMs.current ?? (Date.now() - tickIndex * 5000);
    timeBaseMs.current = base;
    const t = base + tickIndex * 5000;

    setTicks((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.tickIndex === tickIndex) {
        if (last.price === price && last.t === t) return prev;
        const next = prev.slice();
        next[next.length - 1] = { ...last, price, t, tickIndex };
        return next;
      }
      if (last && last.tickIndex > tickIndex) return prev;
      return [...prev.slice(-500), { t, price, tickIndex }];
    });
    lastTickIndex.current = tickIndex;
  };

  const applyHistory = (history: Array<{ tickIndex: number; price: number }>) => {
    if (!history.length) return;
    const sorted = [...history].sort((a, b) => a.tickIndex - b.tickIndex);
    const last = sorted[sorted.length - 1];
    const base = Date.now() - last.tickIndex * 5000;
    timeBaseMs.current = base;
    setTicks(sorted.map((h) => ({
      t: base + h.tickIndex * 5000,
      price: h.price,
      tickIndex: h.tickIndex
    })));
    lastTickIndex.current = last.tickIndex;
  };

  useEffect(() => {
    if (!ws || !sessionId) return;
    const handler = (ev: ServerEvent) => {
      if (ev.sessionId !== sessionId) return;
      if (ev.type === "TICK") {
        lastTickAt.current = Date.now();
        applyTick(ev.tickIndex, ev.price);
        setLastVrf(ev.vrf);
        setSessionState((prev: any) => prev ? {
          ...prev,
          tickIndex: ev.tickIndex,
          price: ev.price,
          phase: ev.phase ?? prev.phase,
          timeRemainingMs: typeof ev.timeRemainingMs === "number" ? ev.timeRemainingMs : prev.timeRemainingMs,
          closingRemainingMs: typeof ev.closingRemainingMs === "number" ? ev.closingRemainingMs : prev.closingRemainingMs
        } : prev);
      }
      if (ev.type === "PLAYER_HUD") setHud(ev);
      if (ev.type === "SESSION_STATE") {
        lastTickAt.current = Date.now();
        setSessionState(ev);
        if (Array.isArray(ev.history) && ev.history.length) {
          applyHistory(ev.history);
        } else {
          applyTick(ev.tickIndex, ev.price);
        }
      }
    };
    const unsubscribe = ws.onEvent(handler);
    return () => unsubscribe?.();
  }, [ws, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/sessions`);
        if (!res.ok) return;
        const sessions = await res.json();
        const session = Array.isArray(sessions) ? sessions.find((s) => s.id === sessionId) : null;
        if (!session) return;
        setSessionState((prev: any) => prev ? { ...prev, ...session } : session);
        if (typeof session.tickIndex === "number") {
          applyTick(session.tickIndex, session.price);
        }
      } catch (err) {
        logError("useSessionFeed/poll", err);
      }
    };
    const id = window.setInterval(poll, 15000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  return { ticks, hud, lastVrf, sessionState };
}
