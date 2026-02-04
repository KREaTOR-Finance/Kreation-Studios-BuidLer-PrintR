import React, { useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { WeightedVoteMeter } from "../components/WeightedVoteMeter";
import { ProposalCard } from "../components/ProposalCard";
import type { GameAPI } from "../state/useGameMachine";
import { useHaptics } from "../state/HapticsProvider";
import { useSounds } from "../state/SoundProvider";

export function GovernanceScreen({ game }:{ game:GameAPI }){
  const { state } = game;
  const h = useHaptics();
  const { play } = useSounds();
  const [govBal] = useState<number | null>(null); // hidden until API ready
  const weight = Math.min(1, (state.streak/20) * 0.35 + (state.points/20000) * 0.65);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Governance</div>
          {govBal !== null && <div style={{opacity:0.85}}>BuiDlers <b>{govBal}</b></div>}
        </div>
        <div style={{marginTop:12}}>
          <WeightedVoteMeter weight={weight} />
        </div>
        <div style={{marginTop:14, textTransform:"uppercase", letterSpacing:1.0, fontSize:12, opacity:0.85}}>Active Proposals</div>
        <div style={{marginTop:10, display:"grid", gap: 12}}>
          <ProposalCard
            title="Add ‘Sprint Mode’ (3s rounds)"
            desc="Ultra-fast rounds for high-skill players. Higher points, tighter windows."
            endsIn="2d 4h"
            forPct={0.63}
            againstPct={0.37}
            onVote={(v)=>{ play("tap"); h.impact("medium"); }}
          />
          <ProposalCard
            title="New Prize Category: Merch Drops"
            desc="Redeem points for limited PrintR merch and seasonal drops."
            endsIn="5d 1h"
            forPct={0.54}
            againstPct={0.46}
            onVote={(v)=>{ play("tap"); h.impact("medium"); }}
          />
        </div>

        <div style={{marginTop:14, fontSize:12, opacity:0.78}}>
          Governance is initially wallet-bound and non-transferable. Future changes require community vote and regulatory clarity.
        </div>
      </Card>
    </div>
  );
}
