import React from "react";

export function ProposalCard({ title, desc, endsIn, forPct, againstPct, onVote }:{
  title:string; desc:string; endsIn:string; forPct:number; againstPct:number;
  onVote:(vote:"FOR"|"AGAINST")=>void;
}){
  return (
    <div style={{
      padding: 16,
      borderRadius: 18,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.10)"
    }}>
      <div style={{display:"flex", justifyContent:"space-between", gap:12}}>
        <div style={{fontWeight:900, letterSpacing:0.9}}>{title}</div>
        <div style={{fontSize:12, opacity:0.75, textTransform:"uppercase"}}>{endsIn}</div>
      </div>
      <div style={{marginTop:6, fontSize:12, opacity:0.82}}>{desc}</div>

      <div style={{marginTop:12}}>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:12, opacity:0.85}}>
          <span>FOR {Math.round(forPct*100)}%</span>
          <span>AGAINST {Math.round(againstPct*100)}%</span>
        </div>
        <div style={{height:10, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.10)", overflow:"hidden", marginTop:6}}>
          <div style={{width:`${forPct*100}%`, height:"100%", background:"rgba(34,197,94,0.75)"}} />
        </div>
      </div>

      <div style={{display:"flex", gap:10, marginTop:14}}>
        <button onClick={()=>onVote("FOR")} style={{
          flex:1, height:44, borderRadius:14,
          border:"1px solid rgba(34,197,94,0.35)",
          background:"rgba(34,197,94,0.12)",
          color:"#F8FAFC", fontWeight:900, letterSpacing:1.1, textTransform:"uppercase", cursor:"pointer"
        }}>Vote For</button>
        <button onClick={()=>onVote("AGAINST")} style={{
          flex:1, height:44, borderRadius:14,
          border:"1px solid rgba(239,68,68,0.35)",
          background:"rgba(239,68,68,0.10)",
          color:"#F8FAFC", fontWeight:900, letterSpacing:1.1, textTransform:"uppercase", cursor:"pointer"
        }}>Vote Against</button>
      </div>
    </div>
  );
}
