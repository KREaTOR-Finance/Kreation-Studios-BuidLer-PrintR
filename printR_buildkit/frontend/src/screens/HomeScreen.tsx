import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { useActiveSessions } from "../hooks/useActiveSessions";
import { getPlayerHeaders } from "../state/player";
import { Badge } from "../components/Badge";
import { ListRow } from "../components/ListRow";
import { API_BASE, apiGet } from "../network/httpClient";
import { WsClient, getWsPlayerId } from "../network/wsClient";
import type { GameAPI } from "../state/useGameMachine";

type BackendSession = {
  id: string;
  assetName: string;
  phase: string;
  price: number;
  tickIndex: number;
  activePlayers?: number;
  endTimeMs?: number;
  closingTimeMs?: number;
};

export function HomeScreen({ game }: { game: GameAPI }){
  const { state, playRound, navigate } = game;
  const player = useMemo(() => getPlayerHeaders(), []);
  const { sessionsBalance } = useCreditsBalance(player);
  const { activeSessions, loading: activeLoading, error: activeError, refresh: refreshActive } = useActiveSessions(player);
  const wsClient = useMemo(() => new WsClient(), []);
  const wsPlayerId = useMemo(() => getWsPlayerId(), []);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [forceCredits, setForceCredits] = useState(false);
  const [sessions, setSessions] = useState<BackendSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lastWsUpdate, setLastWsUpdate] = useState<number | null>(null);
  const [hudBySession, setHudBySession] = useState<Record<string, any>>({});
  const needsCredits = sessionsBalance === 0 || forceCredits;

  useEffect(() => {
    if ((sessionsBalance ?? 0) > 0) setForceCredits(false);
  }, [sessionsBalance]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refreshSessions = async (showLoading = false) => {
    try {
      if (showLoading) setSessionsLoading(true);
      setSessionsError(null);
      const data = await apiGet<BackendSession[]>("/sessions", player);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessionsError("Unable to load sessions right now.");
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions(true);
    const id = window.setInterval(() => refreshSessions(false), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const wsUrl = toWsUrl(API_BASE, wsPlayerId);
    wsClient.connect(wsUrl);
    const unsubscribe = wsClient.onEvent((ev) => {
      if (ev.type !== "TICK") return;
      setLastWsUpdate(Date.now());
      setSessions((prev) => prev.map((s) => {
        if (s.id !== ev.sessionId) return s;
        return {
          ...s,
          price: ev.price,
          tickIndex: ev.tickIndex,
          phase: ev.phase ?? s.phase
        };
      }));
    });
    const hudUnsub = wsClient.onEvent((ev) => {
      if (ev.type !== "PLAYER_HUD") return;
      setHudBySession((prev) => ({ ...prev, [ev.sessionId]: ev }));
    });
    return () => {
      unsubscribe?.();
      hudUnsub?.();
      wsClient.close();
    };
  }, [wsClient, wsPlayerId]);

  useEffect(() => {
    if (!sessions.length) return;
    sessions.forEach((session) => {
      wsClient.send({ type: "SESSION_SUBSCRIBE", sessionId: session.id, clientTs: Date.now() });
    });
  }, [sessions, wsClient]);

  useEffect(() => {
    if (!activeSessions.length) return;
    activeSessions.forEach((session) => {
      wsClient.send({ type: "SESSION_SUBSCRIBE", sessionId: session.sessionId, clientTs: Date.now() });
    });
  }, [activeSessions, wsClient]);

  const sortedSessions = useMemo(() => {
    const rank: Record<string, number> = {
      LIVE: 0,
      FINAL_COMMIT_WARNING: 1,
      CLOSING: 2,
      ENDED: 3
    };
    return [...sessions].sort((a, b) => {
      const ra = rank[a.phase] ?? 9;
      const rb = rank[b.phase] ?? 9;
      if (ra !== rb) return ra - rb;
      return (a.assetName || "").localeCompare(b.assetName || "");
    });
  }, [sessions]);
  const runningCount = useMemo(
    () => sortedSessions.filter((s) => s.phase !== "ENDED").length,
    [sortedSessions]
  );
  const sortedActiveSessions = useMemo(() => {
    const rank: Record<string, number> = {
      LIVE: 0,
      FINAL_COMMIT_WARNING: 1,
      CLOSING: 2,
      ENDED: 3
    };
    return [...activeSessions].sort((a, b) => {
      const ra = rank[a.phase] ?? 9;
      const rb = rank[b.phase] ?? 9;
      if (ra !== rb) return ra - rb;
      return (a.assetName || "").localeCompare(b.assetName || "");
    });
  }, [activeSessions]);

  const leaderboardPreview = useMemo(() => ([
    { name: "NEONWOLF", points: 24550, streak: 18, tier: "LEGEND" },
    { name: "ARCADIA", points: 22110, streak: 14, tier: "BOLD" },
    { name: "BYTEKING", points: 19840, streak: 12, tier: "SAFE" },
    { name: "YOU", points: state.points, streak: state.streak, tier: state.selection.tier }
  ]), [state.points, state.streak, state.selection.tier]);

  const highscoresPreview = useMemo(() => ([
    { session: "AutoAsset-1", player: "NEONWOLF", points: 86790, tier: "BOLD" },
    { session: "AutoAsset-2", player: "ARCADIA", points: 74210, tier: "SAFE" },
    { session: "AutoAsset-3", player: "BYTEKING", points: 68950, tier: "LEGEND" },
    { session: "Personal Best", player: "YOU", points: state.points, tier: state.selection.tier }
  ]), [state.points, state.selection.tier]);

  const handleJoin = async (session: BackendSession) => {
    setJoinError(null);
    if (joinBusyId) return;
    if (needsCredits && session.phase !== "CLOSING") {
      navigate("store");
      return;
    }
    setJoinBusyId(session.id);
    let result: Awaited<ReturnType<typeof playRound>> | null = null;
    try {
      result = await playRound(session.id);
    } finally {
      setJoinBusyId(null);
    }
    if (!result || !result.ok) {
      const reason = result?.reason;
      if (reason === "INSUFFICIENT") {
        setForceCredits(true);
        setJoinError("Not enough credits to join. Buy credits to play.");
        return;
      }
      if (reason === "NOT_JOINABLE") {
        setJoinError("Session is not joinable right now. Try again soon.");
        refreshSessions(false);
        return;
      }
      if (reason === "NO_SESSIONS") {
        setJoinError("No live sessions found. Refresh to try again.");
        refreshSessions(false);
        return;
      }
      if (reason === "RATE_LIMITED") {
        setJoinError("Too many join attempts. Wait a moment and try again.");
        return;
      }
      if (reason === "UNAUTHORIZED") {
        setJoinError("Missing player identity. Refresh the page and try again.");
        return;
      }
      if (reason === "BUSY") {
        setJoinError("Join already in progress. Try again.");
        return;
      }
      if (reason === "JOIN_FAILED") {
        const detail = formatJoinDetail(result);
        setJoinError(detail ? `Unable to join session (${detail}).` : "Unable to join session. Try again.");
        refreshSessions(false);
        return;
      }
      setJoinError("Unable to join session. Try again.");
      refreshSessions(false);
    }
  };

  const actionBtn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    cursor: "pointer"
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Live Sessions" subtitle="Join an active chart or spectate during closing.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Badge text={`${runningCount} running`} tone="teal" />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.7 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: lastWsUpdate && (Date.now() - lastWsUpdate < 10_000)
                  ? "rgba(34,211,238,0.9)"
                  : "rgba(148,163,184,0.6)"
              }} />
              Live feed
            </div>
            <button type="button" style={actionBtn} onClick={() => refreshSessions(true)}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {sessionsLoading && (
            <ListRow left="Loading sessions..." sub="Fetching live session list." />
          )}
          {!sessionsLoading && sessionsError && (
            <ListRow left="Sessions unavailable" sub={sessionsError} />
          )}
          {!sessionsLoading && !sessionsError && sortedSessions.length === 0 && (
            <ListRow left="No sessions available" sub="Try again in a moment." />
          )}
          {!sessionsLoading && !sessionsError && sortedSessions.map((session) => {
            const phase = session.phase ?? "LIVE";
            const joinLabel = phase === "CLOSING" ? "Watch" : phase === "ENDED" ? "Closed" : "Join";
            const joinDisabled = phase === "ENDED" || !!joinBusyId;
            return (
              <ListRow
                key={session.id}
                left={session.assetName || "Session"}
                sub={sessionSubtitle(session, now)}
                right={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {typeof session.activePlayers === "number" && (
                      <Badge text={`${session.activePlayers} players`} tone="blue" />
                    )}
                    <Badge text={phaseLabel(phase)} tone={phaseTone(phase)} />
                    <button
                      type="button"
                      style={{ ...actionBtn, opacity: joinDisabled ? 0.45 : 1, cursor: joinDisabled ? "not-allowed" : actionBtn.cursor }}
                      onClick={() => handleJoin(session)}
                      disabled={joinDisabled}
                    >
                      {joinLabel}
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
        {joinError && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,120,120,0.95)" }}>
            {joinError}
          </div>
        )}
      </Card>

      <Card title="My Active Positions" subtitle="Track positions for sessions you've joined.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Badge text={`${sortedActiveSessions.length} active`} tone="teal" />
          <button type="button" style={actionBtn} onClick={() => refreshActive()}>
            Refresh
          </button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {activeLoading && (
            <ListRow left="Loading active sessions..." sub="Fetching your joined sessions." />
          )}
          {!activeLoading && activeError && (
            <ListRow left="Active sessions unavailable" sub={activeError} />
          )}
          {!activeLoading && !activeError && sortedActiveSessions.length === 0 && (
            <ListRow left="No active positions" sub="Join a live session to track it here." />
          )}
          {!activeLoading && !activeError && sortedActiveSessions.map((session) => {
            const hud = hudBySession[session.sessionId];
            const open = hud?.openPosition ?? null;
            const entry = open ? Number(open.entryPrice).toFixed(2) : "--";
            const unreal = open ? Number(open.unrealized).toFixed(2) : "--";
            const positionLine = open
              ? `${open.direction} ${open.leverage}x | ${open.commitPoints} pts @ ${entry} | UPL ${unreal}`
              : (session.mode === "spectate" ? "Spectating" : "No open position");
            const markerLine = hud ? ` | Markers ${hud.markersRemaining}` : "";
            const statusLabel = open ? "Open" : (session.mode === "spectate" ? "Watch" : "Flat");
            const statusTone = open
              ? (Number(open.unrealized) >= 0 ? "win" : "warn")
              : "blue";
            const sessionInfo: BackendSession = {
              id: session.sessionId,
              assetName: session.assetName,
              phase: session.phase,
              price: session.price,
              tickIndex: session.tickIndex,
              endTimeMs: session.endTimeMs,
              closingTimeMs: session.closingTimeMs,
              activePlayers: session.activePlayers
            };
            return (
              <ListRow
                key={session.sessionId}
                left={session.assetName || "Session"}
                sub={`${sessionSubtitle(sessionInfo, now)} | ${positionLine}${markerLine}`}
                right={<Badge text={statusLabel} tone={statusTone} />}
              />
            );
          })}
        </div>
      </Card>

      {needsCredits && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            You are out of credits. Buy sessions to join live play.
          </div>
        </Card>
      )}

      <Card title="Buy Sessions" subtitle="Arcade credits for live sessions.">
        <div style={{ display: "grid", gap: 10 }}>
          <ListRow
            left="Starter Pack"
            sub="$10 for 40 sessions (minimum buy)"
            right={
              <button type="button" style={actionBtn} onClick={() => navigate("store")}>
                Buy
              </button>
            }
          />
          <ListRow
            left="Pro Pack"
            sub="$100 for 500 sessions (best value)"
            right={
              <button type="button" style={actionBtn} onClick={() => navigate("store")}>
                Buy
              </button>
            }
          />
        </div>
      </Card>

      <Card title="Leaderboard Snapshot" subtitle="Top players this week.">
        <div style={{ display: "grid", gap: 10 }}>
          {leaderboardPreview.map((row, i) => (
            <ListRow
              key={`${row.name}_${row.points}`}
              left={`${i + 1}. ${row.name}`}
              sub={`Streak ${row.streak} | ${row.tier}`}
              right={row.points.toLocaleString()}
            />
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="button" style={actionBtn} onClick={() => navigate("leaderboard")}>
            View leaderboard
          </button>
        </div>
      </Card>

      <Card title="Session Highscores" subtitle="Best single-session scores.">
        <div style={{ display: "grid", gap: 10 }}>
          {highscoresPreview.map((row, i) => (
            <ListRow
              key={`${row.session}_${row.player}`}
              left={`${i + 1}. ${row.player}`}
              sub={`${row.session} | ${row.tier}`}
              right={row.points.toLocaleString()}
            />
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="button" style={actionBtn} onClick={() => navigate("history")}>
            View highscores
          </button>
        </div>
      </Card>

      <Card style={{ padding: 14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", opacity:0.9 }}>
          <span style={{ textTransform:"uppercase", letterSpacing:1.0, fontSize:12 }}>Tip</span>
          <span style={{ fontSize:12, opacity:0.8 }}>SAFE builds streaks. LEGEND builds status.</span>
        </div>
      </Card>
    </div>
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "LIVE":
      return "Live";
    case "FINAL_COMMIT_WARNING":
      return "Final";
    case "CLOSING":
      return "Closing";
    case "ENDED":
      return "Ended";
    default:
      return phase.toLowerCase();
  }
}

function phaseTone(phase: string): "blue" | "purple" | "teal" | "win" | "warn" {
  switch (phase) {
    case "LIVE":
      return "win";
    case "FINAL_COMMIT_WARNING":
      return "warn";
    case "CLOSING":
      return "warn";
    case "ENDED":
      return "purple";
    default:
      return "blue";
  }
}

function sessionSubtitle(session: BackendSession, now: number): string {
  const priceLabel = Number.isFinite(session.price) ? session.price.toFixed(2) : "--";
  const playersLabel = typeof session.activePlayers === "number"
    ? ` | ${session.activePlayers} players`
    : "";
  if (session.phase === "LIVE" || session.phase === "FINAL_COMMIT_WARNING") {
    const remaining = typeof session.closingTimeMs === "number" ? session.closingTimeMs - now : null;
    const timeLabel = remaining === null ? "--:--" : formatCountdown(remaining);
    return `Closing in ${timeLabel} | Price ${priceLabel}${playersLabel}`;
  }
  if (session.phase === "CLOSING") {
    const remaining = typeof session.endTimeMs === "number" ? session.endTimeMs - now : null;
    const timeLabel = remaining === null ? "--:--" : formatCountdown(remaining);
    return `Ends in ${timeLabel} | Price ${priceLabel}${playersLabel}`;
  }
  if (session.phase === "ENDED") {
    return `Ended | Final ${priceLabel}${playersLabel}`;
  }
  return `Price ${priceLabel}${playersLabel}`;
}

function formatCountdown(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatJoinDetail(result: { status?: number; error?: string } | null): string | null {
  if (!result) return null;
  const parts = [];
  if (typeof result.status === "number") parts.push(`HTTP ${result.status}`);
  if (result.error) parts.push(result.error);
  return parts.length ? parts.join(" | ") : null;
}

function toWsUrl(apiBase: string, playerId: string): string {
  const url = new URL(apiBase);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}?playerId=${encodeURIComponent(playerId)}`;
}
