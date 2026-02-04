import React from "react";

export function TopStats({ points, streak, sessions }:{ points:number; streak:number; sessions:number | null }){
  const pill: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)"
  };
  const label: React.CSSProperties = { fontSize: 12, opacity: 0.85, letterSpacing: 0.8, textTransform: "uppercase" };
  const num: React.CSSProperties = { fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap: 12 }}>
      <div style={pill}><span style={label}>Points</span><span style={num}>{points}</span></div>
      <div style={pill}><span style={label}>Streak</span><span style={num}>{streak}</span></div>
      <div style={pill}><span style={label}>Sessions</span><span style={num}>{sessions ?? "—"}</span></div>
    </div>
  );
}
