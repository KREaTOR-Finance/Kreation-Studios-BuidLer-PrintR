import React from "react";

export function EmptyState({ title, sub }:{ title:string; sub:string }){
  return (
    <div style={{
      padding: 18,
      borderRadius: 18,
      border:"1px dashed rgba(255,255,255,0.18)",
      background:"rgba(255,255,255,0.03)"
    }}>
      <div style={{fontWeight:900, letterSpacing:0.9}}>{title}</div>
      <div style={{fontSize:12, opacity:0.82, marginTop:6}}>{sub}</div>
    </div>
  );
}
