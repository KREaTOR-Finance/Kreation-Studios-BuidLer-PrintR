import React, { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { ProgressBar } from "../components/ProgressBar";
import { ObjectiveCard } from "../components/ObjectiveCard";
import type { GameAPI } from "../state/useGameMachine";

export function ProgressScreen({ game }:{ game:GameAPI }){
  const { state } = game;
  const [safeWins] = useState(2);
  const [boldTry] = useState(1);
  const [roundsToday] = useState(5);

  const level = useMemo(() => Math.floor(state.points / 2000) + 1, [state.points]);
  const next = useMemo(() => ((state.points % 2000) / 2000), [state.points]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />

      <Card>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontFamily:"var(--font-display)", fontWeight:900, letterSpacing:1.2, fontSize:24}}>Progress</div>
          <div style={{opacity:0.85}}>Level <b>{level}</b></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={next} label="To next level" />
        </div>

        <div style={{ marginTop: 14, display:"flex", gap: 10 }}>
          <button onClick={()=>game.navigate("vault")} style={quickBtn()}>Prize Vault</button>
          <button onClick={()=>game.navigate("leaderboard")} style={quickBtn()}>Leaderboard</button>
          <button onClick={()=>game.navigate("history")} style={quickBtn()}>Highscores</button>
        </div>

        <div style={{ marginTop: 16, display:"grid", gap: 10 }}>
          <ObjectiveCard title="SAFE Wins" sub="Win 3 SAFE rounds" progress={safeWins} total={3} />
          <ObjectiveCard title="Try BOLD" sub="Play BOLD at least once" progress={boldTry} total={1} />
          <ObjectiveCard title="Daily Rounds" sub="Play 10 rounds today" progress={roundsToday} total={10} />
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop:"1px solid rgba(255,255,255,0.10)" }}>
          <div style={{textTransform:"uppercase", letterSpacing:1.0, fontSize:12, opacity:0.85}}>Next Unlock</div>
          <div style={{marginTop:8, fontWeight:900}}>Neon Chart Skin • “Aurora Line”</div>
          <div style={{fontSize:12, opacity:0.82}}>Keep stacking points to unlock cosmetics and prestige badges.</div>
        </div>
      </Card>
    </div>
  );
}


function quickBtn(): React.CSSProperties {
  return {
    flex:1,
    height:44,
    borderRadius:14,
    border:"1px solid rgba(255,255,255,0.10)",
    background:"rgba(255,255,255,0.04)",
    color:"#F8FAFC",
    fontWeight:900,
    letterSpacing:1.0,
    textTransform:"uppercase",
    cursor:"pointer"
  };
}
