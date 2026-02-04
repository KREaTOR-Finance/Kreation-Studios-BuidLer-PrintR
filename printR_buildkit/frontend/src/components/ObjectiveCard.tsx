import React from "react";

export function ObjectiveCard({ title, sub, progress, total }:{
  title:string; sub:string; progress:number; total:number;
}){
  const done = progress >= total;
  return (
    <div style={{
      padding: 14,
      borderRadius: 16,
      background: done ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.10)"}`,
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center",
      gap: 12
    }}>
      <div>
        <div style={{fontWeight:800, letterSpacing:0.8, textTransform:"uppercase"}}>{title}</div>
        <div style={{fontSize:12, opacity:0.82}}>{sub}</div>
      </div>
      <div style={{fontVariantNumeric:"tabular-nums", fontWeight:800}}>
        {Math.min(progress,total)}/{total} {done ? "✅" : ""}
      </div>
    </div>
  );
}
