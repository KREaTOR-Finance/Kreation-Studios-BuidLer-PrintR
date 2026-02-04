import React, { useEffect, useMemo, useState } from "react";
import { TopStats } from "../components/TopStats";
import { Card } from "../components/Card";
import { PendingSettlementBanner } from "../components/PendingSettlementBanner";
import type { GameAPI } from "../state/useGameMachine";

function CountdownRing({ msLeft }: { msLeft: number }){
  const sec = Math.max(0, Math.ceil(msLeft/1000));
  return (
    <div style={{
      width: 54, height: 54, borderRadius: 999,
      border: "2px solid rgba(34,211,238,0.45)",
      boxShadow: "0 0 18px rgba(34,211,238,0.22)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontVariantNumeric:"tabular-nums",
      fontWeight: 800
    }}>
      {sec}
    </div>
  );
}

function LiveChart(){
  // simple animated SVG sparkline placeholder (replace later)
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(()=>setT(v=>v+1), 120);
    return ()=>window.clearInterval(id);
  },[]);
  const path = useMemo(() => {
    const pts = [];
    const w=320, h=180;
    for(let i=0;i<40;i++){
      const x = (i/39)*w;
      const y = h/2 + Math.sin((i*0.35)+(t*0.1))*36 + Math.sin((i*0.12)+(t*0.06))*18;
      pts.push([x,y]);
    }
    return "M " + pts.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" L ");
  },[t]);
  return (
    <svg width="100%" viewBox="0 0 320 180" style={{ borderRadius: 14 }}>
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(59,130,246,0.95)"/>
          <stop offset="1" stopColor="rgba(139,92,246,0.95)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="180" rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.10)"/>
      <path d={path} fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function LiveRoundScreen({ game }: { game: GameAPI }){
  const { state } = game;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(()=>setNow(Date.now()), 80);
    return ()=>window.clearInterval(id);
  }, []);

  const msLeft = state.live ? Math.max(0, state.live.endsAt - now) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
          <div style={{ textTransform:"uppercase", letterSpacing:1.2, opacity:0.9 }}>
            Live Round • {state.selection.tier}
          </div>
          <CountdownRing msLeft={msLeft} />
        </div>
        <LiveChart />
        {state.pending && <PendingSettlementBanner provider={state.pending.provider} requestId={state.pending.requestId} />}
        <div style={{ marginTop: 10, opacity:0.85 }}>
          {state.selection.tier === "SAFE" ? "Steady window — keep it consistent."
            : state.selection.tier === "BOLD" ? "Tight window — precision matters."
            : "Razor window — elite timing."}
        </div>
      </Card>
    </div>
  );
}
