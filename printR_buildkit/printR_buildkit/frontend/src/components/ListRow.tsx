import React from "react";

export function ListRow({ left, right, sub, onClick }:{
  left: React.ReactNode;
  right?: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: ()=>void;
}){
  return (
    <div
      onClick={onClick}
      style={{
        padding:"12px 12px",
        borderRadius: 14,
        border:"1px solid rgba(255,255,255,0.10)",
        background:"rgba(255,255,255,0.03)",
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        gap: 12,
        cursor: onClick ? "pointer" : "default"
      }}
    >
      <div style={{minWidth:0}}>
        <div style={{fontWeight:800, letterSpacing:0.6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{left}</div>
        {sub && <div style={{fontSize:12, opacity:0.78, marginTop:4}}>{sub}</div>}
      </div>
      {right && <div style={{fontVariantNumeric:"tabular-nums", fontWeight:900}}>{right}</div>}
    </div>
  );
}
