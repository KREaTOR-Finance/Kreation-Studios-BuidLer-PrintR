import React, { useState } from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { Avatar } from "../components/Avatar";
import type { GameAPI } from "../state/useGameMachine";
import { useSounds } from "../state/SoundProvider";
import { useHaptics } from "../state/HapticsProvider";
import { useCreditsBalance } from "../hooks/useCreditsBalance";
import { getPlayerHeaders } from "../state/player";


export function ProfileScreen({ game }:{ game:GameAPI }){
  const player = getPlayerHeaders();
  const { sessionsBalance, refresh } = useCreditsBalance(player);

  const { state } = game;
  const directionLabel = state.selection.direction === "UP" ? "LONG" : "SHORT";
  const [name, setName] = useState("BUIDLER");
  const { play } = useSounds();
  const h = useHaptics();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={sessionsBalance} />

      <Card title="Sessions Balance">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{sessionsBalance ?? "—"}</div>
          <button onClick={()=>{ play("tap"); h.selection(); refresh(); }} style={{ padding:"10px 14px", borderRadius: 12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", color:"white" }}>
            Refresh
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Sessions available to join live rounds. Spectating is free.</div>
      </Card>

      <Card>
        <div style={{display:"flex", gap: 14, alignItems:"center"}}>
          <Avatar seed={name} size={56} />
          <div style={{flex:1}}>
            <div style={{textTransform:"uppercase", letterSpacing:1.0, fontSize:12, opacity:0.8}}>Player</div>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value.toUpperCase().slice(0,16))}
              onFocus={()=>{play("tap"); h.selection();}}
              style={{
                width:"100%",
                marginTop:6,
                background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding:"12px 12px",
                color:"#F8FAFC",
                fontWeight:900,
                letterSpacing:1.2,
                outline:"none"
              }}
            />
          </div>
        </div>

        <div style={{marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10}}>
          <div style={statBox()}>Tokens<br/><b>{state.tokens}</b></div>
          <div style={statBox()}>Best Streak<br/><b>{state.streak}</b></div>
          <div style={statBox()}>Tier<br/><b>{state.selection.tier}</b></div>
          <div style={statBox()}>Direction<br/><b>{directionLabel}</b></div>
        </div>

        <div style={{marginTop:16, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.10)", fontSize:12, opacity:0.78}}>
          Login uses Telegram identity + wallet signature when needed. No passwords.
        </div>
      </Card>
    </div>
  );
}

function statBox(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    background:"rgba(255,255,255,0.04)",
    border:"1px solid rgba(255,255,255,0.10)",
    fontSize: 12,
    opacity: 0.9
  };
}
