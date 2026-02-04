import React from "react";

export function ProgressBar({ value, label }:{ value:number; label?:string }){
  const v = Math.max(0, Math.min(1, value));
  return (
    <div>
      {label && <div style={{display:"flex", justifyContent:"space-between", fontSize:12, opacity:0.85, marginBottom:6}}>
        <span style={{textTransform:"uppercase", letterSpacing:0.9}}>{label}</span>
        <span style={{fontVariantNumeric:"tabular-nums"}}>{Math.round(v*100)}%</span>
      </div>}
      <div style={{height:10, borderRadius:999, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.10)", overflow:"hidden"}}>
        <div style={{
          width:`${v*100}%`,
          height:"100%",
          background:"linear-gradient(90deg, rgba(34,211,238,0.85), rgba(59,130,246,0.85))",
          boxShadow:"0 0 18px rgba(34,211,238,0.22)"
        }} />
      </div>
    </div>
  );
}
