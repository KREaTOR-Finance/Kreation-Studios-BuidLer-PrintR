import React from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import type { GameAPI } from "../state/useGameMachine";

export function HistoryScreen({ game }:{ game:GameAPI }){
  const { state } = game;

  // Placeholder: in production, store round history entries from settlement outcomes.
  const rounds = [
    { outcome:"WIN", tier:"SAFE", delta:"+250", when:"2m ago" },
    { outcome:"MISS", tier:"BOLD", delta:"+0", when:"6m ago" },
    { outcome:"WIN", tier:"LEGEND", delta:"+800", when:"12m ago" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Round History</div>
          <Badge text="Local" tone="blue" />
        </div>
        <div style={{marginTop:10, fontSize:12, opacity:0.82}}>
          Your recent rounds. When VRF is enabled, each entry can link to its settlement proof.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 10}}>
          {rounds.map((r, i) => (
            <ListRow
              key={i}
              left={<span>{r.outcome} • {r.tier}</span>}
              sub={r.when}
              right={<span style={{color: r.outcome==="WIN" ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.92)"}}>{r.delta}</span>}
            />
          ))}
        </div>

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          Next: persist history per player + export/share “receipt” of VRF settlement.
        </div>
      </Card>
    </div>
  );
}
