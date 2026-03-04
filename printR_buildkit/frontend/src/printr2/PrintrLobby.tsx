import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendSessions } from "./hooks/useBackendSessions";
import "./tokens.css";
import "./ui.css";
import "./screens.css";

import { Button, Panel, Pill } from "./ui";

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
  const { items, status, error } = useBackendSessions();

  const now = Date.now();
  const ordered = useMemo(() => {
    const score = (s: SessionItem) => {
      const closing = now >= s.closingTimeMs;
      const ended = now >= s.endTimeMs;
      if (ended) return 9999;
      if (closing) return 1000 + (s.endTimeMs - now);
      return (s.endTimeMs - now);
    };
    return [...items].sort((a,b)=>score(a)-score(b));
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
            <div className="p2-sub">{status === "loading" ? "Connecting…" : `Backend offline: ${error ?? "FAILED"}`}</div>
          )}
          <div className="p2-grid">
            {ordered.map(s => (
              <Panel key={s.id} as="button" className="p2-card" onClick={()=>nav(`/session/${s.id}`)}>
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
                  <div className="p2-mini">Regime {s.marketIndex} • {s.archetype}</div>
                  <div className="p2-mini">Supply {fmtSupply(s.supply)}</div>
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
