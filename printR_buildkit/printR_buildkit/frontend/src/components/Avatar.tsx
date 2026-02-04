import React from "react";

export function Avatar({ seed, size=56 }:{ seed:string; size?:number }){
  // simple deterministic gradient avatar (replace with image upload later)
  const hash = Array.from(seed).reduce((a,c)=>a + c.charCodeAt(0), 0);
  const a = (hash * 37) % 360;
  const b = (hash * 73) % 360;
  return (
    <div style={{
      width:size, height:size, borderRadius: 18,
      background:`linear-gradient(135deg, hsl(${a} 90% 55% / .75), hsl(${b} 90% 55% / .65))`,
      border:"1px solid rgba(255,255,255,0.14)",
      boxShadow:"0 0 18px rgba(59,130,246,0.18)"
    }} />
  );
}
