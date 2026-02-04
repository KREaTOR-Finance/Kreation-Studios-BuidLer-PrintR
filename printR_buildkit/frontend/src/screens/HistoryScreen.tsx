import React, { useMemo } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import type { GameAPI } from "../state/useGameMachine";

export function HistoryScreen({ game }:{ game:GameAPI }){
  const { state } = game;

  const rows = useMemo(() => ([
    { session: "AutoAsset-1", player: "NEONWOLF", points: 86790, tier: "BOLD" },
    { session: "AutoAsset-2", player: "ARCADIA", points: 74210, tier: "SAFE" },
    { session: "AutoAsset-3", player: "BYTEKING", points: 68950, tier: "LEGEND" },
    { session: "Personal Best", player: "YOU", points: state.points, tier: state.selection.tier }
  ]), [state.points, state.selection.tier]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Session Highscores</div>
          <Badge text="All-time" tone="teal" />
        </div>
        <div style={{marginTop:10, fontSize:12, opacity:0.82}}>
          Best single-session scores from live play.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 10}}>
          {rows.map((r, i) => (
            <ListRow
              key={`${r.session}_${r.player}`}
              left={`${i + 1}. ${r.player}`}
              sub={`${r.session} | ${r.tier}`}
              right={r.points.toLocaleString()}
            />
          ))}
        </div>

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          Highscores update when sessions close.
        </div>
      </Card>
    </div>
  );
}
