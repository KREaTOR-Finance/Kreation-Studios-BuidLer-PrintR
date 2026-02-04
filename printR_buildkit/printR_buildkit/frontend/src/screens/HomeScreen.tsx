import React from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { getPlayerHeaders } from "../state/player";
import { DirectionSelector, RiskTierSelector } from "../components/Selectors";
import { Button } from "../components/Button";
import type { GameAPI } from "../state/useGameMachine";

export function HomeScreen({ game }: { game: GameAPI }){
  const { state, dispatch, playRound } = game;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.6, fontSize:34, marginBottom:8 }}>
          PRINT-R
        </div>
        <div style={{ opacity:0.85, marginBottom:12 }}>PLAY • WIN • DECIDE</div>

        <DirectionSelector value={state.selection.direction} onChange={(d)=>dispatch({type:"SET_DIRECTION", direction:d})} />
        <div style={{ height: 10 }} />
        <RiskTierSelector value={state.selection.tier} onChange={(t)=>dispatch({type:"SET_TIER", tier:t})} />

        <div style={{ height: 14 }} />
        <Button onClick={playRound}>
          Play 1 Token ({state.tokens} left)
        </Button>
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
