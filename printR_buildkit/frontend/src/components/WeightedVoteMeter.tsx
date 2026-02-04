import React from "react";

export function WeightedVoteMeter({ weight }:{ weight:number }){
  const w = Math.max(0, Math.min(1, weight));
  return (
    <div style={{
      padding: 14, borderRadius: 18,
      background:"linear-gradient(135deg, rgba(59,130,246,0.10), rgba(139,92,246,0.10))",
      border:"1px solid rgba(255,255,255,0.10)"
    }}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
        <div style={{textTransform:"uppercase", letterSpacing:1.0, fontSize:12, opacity:0.85}}>Voting Power</div>
        <div style={{fontVariantNumeric:"tabular-nums", fontWeight:900}}>{Math.round(w*100)}%</div>
      </div>
      <div style={{height:10, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.10)", overflow:"hidden"}}>
        <div style={{
          width:`${w*100}%`, height:"100%",
          background:"linear-gradient(90deg, rgba(59,130,246,0.85), rgba(139,92,246,0.85))",
          boxShadow:"var(--glow-purple)"
        }} />
      </div>
      <div style={{marginTop:8, fontSize:12, opacity:0.82}}>
        Earn more influence by playing consistently and winning at higher tiers.
      </div>
    </div>
  );
}
