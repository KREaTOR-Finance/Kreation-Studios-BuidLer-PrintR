import React from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ListRow } from "../components/ListRow";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import type { GameAPI } from "../state/useGameMachine";

export function VaultScreen({ game }:{ game:GameAPI }){
  const { state } = game;

  // Placeholder rewards inventory
  const rewards: Array<{name:string; cost:number; status:"Locked"|"Claimable"|"Claimed"}> = [
    { name: "Neon Chart Skin — Aurora Line", cost: 5000, status: "Locked" },
    { name: "Profile Badge — Early Printer", cost: 2500, status: "Claimable" },
    { name: "Sticker Pack — PrintR Set 01", cost: 1500, status: "Claimed" }
  ];

  const hasAny = rewards.length > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Prize Vault</div>
          <div style={{opacity:0.85}}>Points <b>{state.points}</b></div>
        </div>
        <div style={{marginTop:10, fontSize:12, opacity:0.82}}>
          Redeem points for prizes, cosmetics, and drops. Points are not money and are not withdrawable.
        </div>

        <div style={{marginTop:14, display:"grid", gap: 10}}>
          {hasAny ? rewards.map((r, i) => (
            <ListRow
              key={i}
              left={r.name}
              sub={`Cost: ${r.cost.toLocaleString()} points`}
              right={<Badge text={r.status} tone={r.status==="Claimable" ? "win" : r.status==="Locked" ? "warn" : "blue"} />}
              onClick={()=>{ /* later: claim flow */ }}
            />
          )) : (
            <EmptyState title="No prizes yet" sub="Play to earn points and unlock your first drops." />
          )}
        </div>

        <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          In production: prize claims will be tracked to your profile and (when needed) wallet identity.
        </div>
      </Card>
    </div>
  );
}
