import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendSessions } from "./hooks/useBackendSessions";
import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { Button, Panel, Pill } from "./ui";
import { apiPost } from "../network/httpClient";
import { getPrintr2PlayerRef } from "./playerRef";
import { getWsPlayerId } from "../network/wsClient";

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

export function PrintrLobby(){
  const nav = useNavigate();
  const { items, status, error, refresh } = useBackendSessions();
  const player = useMemo(() => ({ playerRef: getPrintr2PlayerRef() }), []);
  const playerId = useMemo(() => getWsPlayerId(), []);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  const now = Date.now();
  const ordered = useMemo(() => {
    const phaseRank = (s: SessionItem) => {
      if (now >= s.endTimeMs) return 3;
      if (now >= s.closingTimeMs) return 2;
      return 1;
    };
    return [...items]
      .filter(s => now < s.endTimeMs)
      .sort((a,b) => {
        const ra = phaseRank(a);
        const rb = phaseRank(b);
        if (ra !== rb) return ra - rb;
        // within same rank, earlier end first
        return (a.endTimeMs - now) - (b.endTimeMs - now);
      });
  }, [items, now]);

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame">
        <header className="p2-top">
          <Button variant="ghost" onClick={()=>nav("/")}>Back</Button>
          <div className="p2-markText" style={{ opacity: 0.9 }}>Choose a session</div>
          <div style={{ width: 72 }} />
        </header>

        <main className="p2-lobby">
          {status !== "ok" && (
            <div className="p2-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span>{status === "loading" ? "Connecting…" : `Backend offline: ${error ?? "FAILED"}`}</span>
              <Button variant="secondary" onClick={() => void refresh()}>Retry</Button>
            </div>
          )}
          {joinErr ? <div className="p2-mini" style={{ color: "rgba(255,120,120,.95)", marginBottom: 10 }}>{joinErr}</div> : null}
          <div className="p2-grid">
            {ordered.map(s => (
              <Panel
                key={s.id}
                as="button"
                className="p2-card"
                onClick={async () => {
                  setJoinErr(null);
                  setJoining(s.id);
                  try {
                    const idem = `${playerId}:${s.id}`;
                    await apiPost(`/api/sessions/${s.id}/join`, { playerId }, { ...player, idempotencyKey: idem } as any);
                    nav(`/session/${s.id}`);
                  } catch (e: any) {
                    const msg = e?.message ?? "JOIN_FAILED";
                    setJoinErr(msg);
                    // allow spectate even if you have no credits
                    nav(`/session/${s.id}`);
                  } finally {
                    setJoining(null);
                  }
                }}
              >
                <div className="p2-cardTop">
                  <div className="p2-cardTitle">{s.assetName}</div>
                  <Pill tone={now >= s.endTimeMs ? "dead" : now >= s.closingTimeMs ? "warn" : "live"}>{pillText(s, now)}</Pill>
                </div>
                <div className="p2-cardMid">
                  <div className="p2-metric">
                    <div className="p2-metricLabel">PRICE</div>
                    <div className="p2-metricValue">{s.price.toFixed(3)}</div>
                  </div>
                  <div className="p2-metric">
                    <div className="p2-metricLabel">TICK</div>
                    <div className="p2-metricValue">{s.tickIndex}</div>
                  </div>
                </div>
                <div className="p2-cardBottom">
                  <div className="p2-mini">{pillText(s, now)} • {fmtTime(now >= s.closingTimeMs ? (s.endTimeMs - now) : (s.closingTimeMs - now))}</div>
                  <div className="p2-mini">Regime {s.marketIndex} • {s.archetype}</div>
                </div>
              </Panel>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function fmtSupply(n: number){
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(0)}M`;
  return String(n);
}

function fmtTime(ms: number){
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2,'0')}`;
}

function pillText(s: SessionItem, now: number){
  if (now >= s.endTimeMs) return "ENDED";
  if (now >= s.closingTimeMs) return "CLOSING";
  return "LIVE";
}

function pillClass(s: SessionItem, now: number){
  if (now >= s.endTimeMs) return "p2-pillDead";
  if (now >= s.closingTimeMs) return "p2-pillWarn";
  return "p2-pillLive";
}
