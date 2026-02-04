import React from "react";
import { Direction, RiskTier } from "../state/machine";
import { useHaptics } from "../state/HapticsProvider";

export function DirectionSelector({ value, onChange }: { value: Direction; onChange: (d: Direction)=>void }){
  const h = useHaptics();
  const btn = (active:boolean, color:string): React.CSSProperties => ({
    flex:1,
    height: 64,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: active ? color : "rgba(255,255,255,0.04)",
    boxShadow: active ? (color.includes("34,197,94") ? "var(--glow-win)" : "var(--glow-loss)") : "none",
    color:"#F8FAFC",
    fontWeight:800,
    letterSpacing:1.2,
    textTransform:"uppercase",
    cursor:"pointer"
  });

  return (
    <div style={{ display:"flex", gap: 12 }}>
      <button style={btn(value==="UP","rgba(34,197,94,0.25)")} onClick={()=>{h.selection(); onChange("UP");}}>LONG</button>
      <button style={btn(value==="DOWN","rgba(239,68,68,0.22)")} onClick={()=>{h.selection(); onChange("DOWN");}}>SHORT</button>
    </div>
  );
}

const tierMeta: Record<RiskTier, { label: string; accent: string; sub: string }> = {
  SAFE: { label:"SAFE", accent:"rgba(59,130,246,0.25)", sub:"Consistent" },
  BOLD: { label:"BOLD", accent:"rgba(139,92,246,0.25)", sub:"Precise" },
  LEGEND: { label:"LEGEND", accent:"rgba(245,158,11,0.20)", sub:"Elite" }
};

export function RiskTierSelector({ value, onChange }: { value: RiskTier; onChange: (t: RiskTier)=>void }){
  const h = useHaptics();
  return (
    <div style={{ display:"flex", gap:12 }}>
      {(Object.keys(tierMeta) as RiskTier[]).map((t) => {
        const active = value===t;
        const meta = tierMeta[t];
        return (
          <button
            key={t}
            onClick={()=>{h.selection(); onChange(t);}}
            style={{
              flex:1,
              height: 76,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: active ? meta.accent : "rgba(255,255,255,0.04)",
              boxShadow: active ? (t==="SAFE" ? "var(--glow-blue)" : t==="BOLD" ? "var(--glow-purple)" : "0 0 18px rgba(245,158,11,0.28)") : "none",
              color:"#F8FAFC",
              cursor:"pointer",
              display:"flex",
              flexDirection:"column",
              justifyContent:"center",
              alignItems:"center",
              gap:4
            }}
          >
            <div style={{ fontWeight:900, letterSpacing:1.2 }}>{meta.label}</div>
            <div style={{ fontSize:12, opacity:0.85 }}>{meta.sub}</div>
          </button>
        );
      })}
    </div>
  );
}
