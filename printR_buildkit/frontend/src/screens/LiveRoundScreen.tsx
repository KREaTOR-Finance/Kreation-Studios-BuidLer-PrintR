import React, { useEffect, useMemo, useRef, useState } from "react";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { PendingSettlementBanner } from "../components/PendingSettlementBanner";
import type { GameAPI } from "../state/useGameMachine";
import { TradingViewLikeChart } from "../components/charts/TradingViewLikeChart";
import { useSessionFeed } from "../hooks/useSessionFeed";
import { WsClient, getWsPlayerId } from "../network/wsClient";
import { API_BASE } from "../network/httpClient";
import { VrfProofBadge } from "../components/vrf/VrfProofBadge";
import { Button } from "../components/Button";

function CountdownRing({ msLeft }: { msLeft: number }){
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const label = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return (
    <div style={{
      width: 54, height: 54, borderRadius: 999,
      border: "2px solid rgba(34,211,238,0.45)",
      boxShadow: "0 0 18px rgba(34,211,238,0.22)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontVariantNumeric:"tabular-nums",
      fontWeight: 800,
      fontSize: 12,
      letterSpacing: 0.6
    }}>
      {label}
    </div>
  );
}

export function LiveRoundScreen({ game }: { game: GameAPI }){
  const { state } = game;
  const [now, setNow] = useState(Date.now());
  const wsClient = useMemo(() => new WsClient(), []);
  const sessionId = state.join?.sessionId ?? null;
  const playerId = useMemo(() => getWsPlayerId(), []);
  const { ticks, hud, lastVrf, sessionState } = useSessionFeed(wsClient, sessionId);
  const [commitPoints, setCommitPoints] = useState(250);
  const [commitDirection, setCommitDirection] = useState<"LONG" | "SHORT">(
    state.selection.direction === "UP" ? "LONG" : "SHORT"
  );
  const [commitLeverage, setCommitLeverage] = useState(1);
  const [localMarkers, setLocalMarkers] = useState<number | null>(null);
  const [localHasOpen, setLocalHasOpen] = useState(false);
  const sessionClockRef = useRef<{ closingAt: number; endAt: number } | null>(null);
  const clockSeedRef = useRef<{ closingRemainingMs: number; timeRemainingMs: number } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      wsClient.close();
      return;
    }
    const wsUrl = toWsUrl(API_BASE, playerId);
    wsClient.connect(wsUrl);
    wsClient.send({ type: "SESSION_SUBSCRIBE", sessionId, clientTs: Date.now() });
    return () => { wsClient.close(); };
  }, [sessionId, wsClient, playerId]);

  useEffect(() => {
    sessionClockRef.current = null;
    clockSeedRef.current = null;
    setLocalMarkers(10);
    setLocalHasOpen(false);
  }, [sessionId]);

  useEffect(() => {
    if (typeof hud?.markersRemaining === "number") setLocalMarkers(hud.markersRemaining);
    if (typeof hud?.hasOpen === "boolean") setLocalHasOpen(hud.hasOpen);
  }, [hud?.markersRemaining, hud?.hasOpen]);

  useEffect(() => {
    if (!sessionState) return;
    const nowMs = Date.now();
    const closingRemaining = Number(sessionState.closingRemainingMs ?? 0);
    const timeRemaining = Number(sessionState.timeRemainingMs ?? 0);
    if (!Number.isFinite(closingRemaining) || !Number.isFinite(timeRemaining)) return;
    const prevSeed = clockSeedRef.current;
    if (
      prevSeed &&
      prevSeed.closingRemainingMs === closingRemaining &&
      prevSeed.timeRemainingMs === timeRemaining
    ) return;
    clockSeedRef.current = { closingRemainingMs: closingRemaining, timeRemainingMs: timeRemaining };
    sessionClockRef.current = {
      closingAt: nowMs + Math.max(0, closingRemaining),
      endAt: nowMs + Math.max(0, timeRemaining)
    };
  }, [sessionId, sessionState?.closingRemainingMs, sessionState?.timeRemainingMs]);

  useEffect(() => {
    if (!wsClient || !sessionId) return;
    const unsubscribe = wsClient.onEvent((ev) => {
      if (ev.sessionId !== sessionId) return;
      if (ev.type !== "FX_EVENT") return;
      if (ev.fx === "COMMIT_SONAR") setLocalHasOpen(true);
      if (ev.fx === "CLOSE_GAIN" || ev.fx === "CLOSE_LOSS" || ev.fx === "BREAK_POINT" || ev.fx === "FORFEIT") {
        setLocalHasOpen(false);
      }
    });
    return () => unsubscribe?.();
  }, [wsClient, sessionId]);

  const sessionClock = sessionClockRef.current;
  const spectator = state.join?.mode === "spectate";
  const timePhase = sessionClock
    ? (now >= sessionClock.endAt ? "ENDED" : now >= sessionClock.closingAt ? "CLOSING" : "LIVE")
    : null;
  const derivedPhase = sessionState?.phase ?? timePhase ?? (spectator ? "CLOSING" : "LIVE");
  const msLeft = sessionClock
    ? Math.max(0, sessionClock.endAt - now)
    : (state.live ? Math.max(0, state.live.endsAt - now) : 0);
  const lastTick = ticks.length ? ticks[ticks.length - 1] : null;
  const priceLabel = lastTick ? lastTick.price.toFixed(4) : "--";
  const sessionLabel = sessionState?.assetName ?? "Session";
  const pointsDisplay = typeof hud?.scoreDisplay === "number" ? Math.round(hud.scoreDisplay) : state.points;
  const markersDisplay = typeof hud?.markersRemaining === "number" ? hud.markersRemaining : localMarkers;
  const markersAvailable = typeof hud?.markersRemaining === "number"
    ? hud.markersRemaining
    : (localMarkers ?? 0);
  const hasOpen = typeof hud?.hasOpen === "boolean" ? hud.hasOpen : localHasOpen;
  const minHoldMet = hud?.openPosition && typeof sessionState?.tickIndex === "number"
    ? (sessionState.tickIndex - hud.openPosition.entryTickIndex) >= 1
    : true;
  const canCommit = !!sessionId && derivedPhase === "LIVE" && !spectator && markersAvailable > 1 && !hasOpen;
  const canClose = !!sessionId && !spectator && hasOpen && derivedPhase !== "ENDED" && minHoldMet;
  const inputLocked = spectator || derivedPhase !== "LIVE" || hasOpen;

  const handleCommit = () => {
    if (!sessionId || !canCommit) return;
    wsClient.send({
      type: "PLAYER_INTENT",
      sessionId,
      playerId,
      intent: "OPEN",
      payload: {
        commitPoints: commitPoints,
        direction: commitDirection,
        leverage: commitLeverage
      },
      clientTs: Date.now()
    });
  };

  const handleClose = () => {
    if (!sessionId || !canClose) return;
    wsClient.send({
      type: "PLAYER_INTENT",
      sessionId,
      playerId,
      intent: "CLOSE",
      payload: { positionId: hud?.openPosition?.positionId },
      clientTs: Date.now()
    });
  };

  const optionBase: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    cursor: "pointer"
  };
  const optionStyle = (
    active: boolean,
    tone: "neutral" | "long" | "short" = "neutral",
    disabled = false
  ): React.CSSProperties => {
    const accent =
      tone === "long" ? "34,197,94" :
      tone === "short" ? "239,68,68" :
      "34,211,238";
    return {
      ...optionBase,
      border: active ? `1px solid rgba(${accent},0.7)` : optionBase.border,
      background: active ? `rgba(${accent},0.16)` : optionBase.background,
      color: active ? "#E0F2FE" : optionBase.color,
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? "not-allowed" : optionBase.cursor
    };
  };
  const actionStyle = (enabled: boolean): React.CSSProperties => ({
    height: 46,
    width: "100%",
    opacity: enabled ? 1 : 0.45,
    cursor: enabled ? "pointer" : "not-allowed"
  });
  const statBox: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12
  };

  const commitOptions = [100, 250, 500, 750, 1000];
  const leverageOptions = [1, 2, 3, 4, 5];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={pointsDisplay} streak={state.streak} sessions={null} />
      {spectator && (
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>
            Spectator Mode
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            This session is in closing. You are spectating and no credits are consumed.
          </div>
        </Card>
      )}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap: 4 }}>
            <div style={{ textTransform:"uppercase", letterSpacing:1.2, opacity:0.9 }}>
              {sessionLabel} {"->"} {state.selection.tier}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {derivedPhase} {"->"} {priceLabel}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
            <VrfProofBadge vrf={lastVrf ?? undefined} />
            <CountdownRing msLeft={msLeft} />
          </div>
        </div>
        <TradingViewLikeChart data={ticks} height={260} />
        {ticks.length === 0 && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Waiting for live session feed...
          </div>
        )}
        {state.pending && <PendingSettlementBanner provider={state.pending.provider} requestId={state.pending.requestId} />}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
          <div style={statBox}>
            <div style={{ opacity: 0.7, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>Score</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{pointsDisplay}</div>
          </div>
          <div style={statBox}>
            <div style={{ opacity: 0.7, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>Markers</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{markersDisplay ?? "--"}</div>
          </div>
          <div style={statBox}>
            <div style={{ opacity: 0.7, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>Status</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>
              {hasOpen ? "Position Open" : "Flat"}
            </div>
          </div>
        </div>

        {hud?.openPosition && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Open: {hud.openPosition.direction} {hud.openPosition.leverage}x, {hud.openPosition.commitPoints} pts @
            {" "}{Number(hud.openPosition.entryPrice).toFixed(4)} | Unreal: {Number(hud.openPosition.unrealized).toFixed(2)}
          </div>
        )}
        {hud?.flags?.finalCloseRequired && (
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(251,191,36,0.95)" }}>
            Final close required before session ends.
          </div>
        )}
        {!minHoldMet && hasOpen && (
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Hold at least 1 tick before closing.
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75, minWidth: 74 }}>Direction</div>
            <button
              type="button"
              disabled={inputLocked}
              style={optionStyle(commitDirection === "LONG", "long", inputLocked)}
              onClick={() => setCommitDirection("LONG")}
            >
              Long
            </button>
            <button
              type="button"
              disabled={inputLocked}
              style={optionStyle(commitDirection === "SHORT", "short", inputLocked)}
              onClick={() => setCommitDirection("SHORT")}
            >
              Short
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75, minWidth: 74 }}>Leverage</div>
            {leverageOptions.map((value) => (
              <button
                key={value}
                type="button"
                disabled={inputLocked}
                style={optionStyle(commitLeverage === value, "neutral", inputLocked)}
                onClick={() => setCommitLeverage(value)}
              >
                {value}x
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75, minWidth: 74 }}>Commit</div>
            {commitOptions.map((value) => (
              <button
                key={value}
                type="button"
                disabled={inputLocked}
                style={optionStyle(commitPoints === value, "neutral", inputLocked)}
                onClick={() => setCommitPoints(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
            <Button variant="secondary" disabled={!canCommit} onClick={handleCommit} style={actionStyle(canCommit)}>
              Commit
            </Button>
            <Button variant="secondary" disabled={!canClose} onClick={handleClose} style={actionStyle(canClose)}>
              Close
            </Button>
          </div>
          {derivedPhase === "LIVE" && !spectator && !hasOpen && markersAvailable <= 1 && (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Final marker reserved for close.
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, opacity:0.85 }}>
          {derivedPhase === "LIVE"
            ? "Commit in live, then close to lock your score."
            : derivedPhase === "CLOSING"
              ? "Closing phase: no new commits, closes only."
              : "Session ended. Join another live session."}
        </div>
      </Card>
    </div>
  );
}

function toWsUrl(apiBase: string, playerId: string): string {
  const url = new URL(apiBase);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}?playerId=${encodeURIComponent(playerId)}`;
}
