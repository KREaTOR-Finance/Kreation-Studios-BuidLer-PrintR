import React from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import type { GameAPI } from "../state/useGameMachine";

export function LeaderboardScreen({ game }:{ game:GameAPI }){
  const { state } = game;

  const rows = [
    { name: "NEONWOLF", points: 24550, streak: 18, tier: "LEGEND" },
    { name: "ARCADIA", points: 22110, streak: 14, tier: "BOLD" },
    { name: "BYTEKING", points: 19840, streak: 12, tier: "SAFE" },
    { name: "YOU", points: state.points, streak: state.streak, tier: state.selection.tier }
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Leaderboard</div>
          <Badge text="Weekly" tone="teal" />
        </div>
        <div style={{marginTop:10, fontSize:12, opacity:0.82}}>
          Rankings reflect points and consistency. Keep streaks alive to climb faster.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 10}}>
          {rows.map((r, i) => (
            <ListRow
              key={i}
              left={<span>{i+1}. {r.name}</span>}
              sub={`Streak: ${r.streak} • Tier: ${r.tier}`}
              right={<span>{r.points.toLocaleString()}</span>}
            />
          ))}
        </div>

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          In production: daily/weekly/friends leaderboards + shareable win cards for X funnel.
        </div>
      </Card>
    </div>
  );
}
