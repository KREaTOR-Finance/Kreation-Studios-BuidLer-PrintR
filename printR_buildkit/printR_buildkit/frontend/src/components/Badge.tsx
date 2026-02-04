import React from "react";

export function Badge({ text, tone="blue" }:{ text:string; tone?:"blue"|"purple"|"teal"|"win"|"warn" }){
  const map: Record<string, {bg:string; bd:string}> = {
    blue: { bg:"rgba(59,130,246,0.14)", bd:"rgba(59,130,246,0.30)" },
    purple: { bg:"rgba(139,92,246,0.14)", bd:"rgba(139,92,246,0.30)" },
    teal: { bg:"rgba(34,211,238,0.14)", bd:"rgba(34,211,238,0.28)" },
    win: { bg:"rgba(34,197,94,0.12)", bd:"rgba(34,197,94,0.28)" },
    warn: { bg:"rgba(245,158,11,0.12)", bd:"rgba(245,158,11,0.28)" }
  };
  const s = map[tone];
  return (
    <span style={{
      padding:"6px 10px",
      borderRadius:999,
      background:s.bg,
      border:`1px solid ${s.bd}`,
      fontSize:11,
      letterSpacing:1.0,
      textTransform:"uppercase",
      opacity:0.95,
      whiteSpace:"nowrap"
    }}>{text}</span>
  );
}
