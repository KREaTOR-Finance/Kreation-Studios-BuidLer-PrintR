import React, { useMemo, useState } from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { ListRow } from "./ListRow";
import { useActiveSessions } from "../hooks/useActiveSessions";
import { getPlayerHeaders } from "../state/player";
import type { GameAPI } from "../state/useGameMachine";

export function ActiveSessionsBanner({ game }: { game: GameAPI }) {
  const player = useMemo(() => getPlayerHeaders(), []);
  const { activeSessions, error } = useActiveSessions(player);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeId = game.state.join?.sessionId ?? null;

  const sorted = useMemo(() => {
    const rank: Record<string, number> = { LIVE: 0, FINAL_COMMIT_WARNING: 1, CLOSING: 2, ENDED: 3 };
    return [...activeSessions].sort((a, b) => {
      const ra = rank[a.phase] ?? 9;
      const rb = rank[b.phase] ?? 9;
      if (ra !== rb) return ra - rb;
      return (a.assetName || "").localeCompare(b.assetName || "");
    });
  }, [activeSessions]);

  if (!sorted.length) return null;

  const onResume = async (sessionId: string) => {
    if (busyId) return;
    setResumeError(null);
    setBusyId(sessionId);
    const result = await game.resumeSession(sessionId);
    setBusyId(null);
    if (!result.ok) {
      const detail = result.error ? `${result.error}` : "Unable to resume session.";
      setResumeError(detail);
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
    <Card title="Active Sessions" subtitle="Resume any live asset you have joined.">
      <div style={{ display: "grid", gap: 10 }}>
        {sorted.map((session) => {
          const isActive = session.sessionId === activeId;
          const phase = session.phase ?? "LIVE";
          const label = phase === "CLOSING" && session.mode === "spectate"
            ? "Watch"
            : isActive
              ? "Viewing"
              : "Resume";
          const disabled = isActive || !!busyId;
          return (
            <ListRow
              key={session.sessionId}
              left={session.assetName || "Session"}
              sub={sessionSubtitle(session)}
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge text={phaseLabel(phase)} tone={phaseTone(phase)} />
                  <button
                    type="button"
                    style={{
                      ...actionBtn,
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? "not-allowed" : actionBtn.cursor
                    }}
                    onClick={() => onResume(session.sessionId)}
                    disabled={disabled}
                  >
                    {busyId === session.sessionId ? "Loading..." : label}
                  </button>
                </div>
              }
            />
          );
        })}
      </div>
      {(resumeError || error) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,120,120,0.95)" }}>
          {resumeError ?? error}
        </div>
      )}
    </Card>
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

function sessionSubtitle(session: { phase: string; price: number; endTimeMs: number; closingTimeMs: number }) {
  const priceLabel = Number.isFinite(session.price) ? session.price.toFixed(2) : "--";
  const now = Date.now();
  if (session.phase === "LIVE" || session.phase === "FINAL_COMMIT_WARNING") {
    const remaining = Number.isFinite(session.closingTimeMs) ? session.closingTimeMs - now : null;
    const timeLabel = remaining === null ? "--:--" : formatCountdown(remaining);
    return `Closing in ${timeLabel} | Price ${priceLabel}`;
  }
  if (session.phase === "CLOSING") {
    const remaining = Number.isFinite(session.endTimeMs) ? session.endTimeMs - now : null;
    const timeLabel = remaining === null ? "--:--" : formatCountdown(remaining);
    return `Ends in ${timeLabel} | Price ${priceLabel}`;
  }
  return `Price ${priceLabel}`;
}

function formatCountdown(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
