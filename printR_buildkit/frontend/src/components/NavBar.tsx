import React from "react";

export type NavKey = "home" | "progress" | "store" | "governance" | "profile";

const items: Array<{key:NavKey; label:string; icon:string}> = [
  { key:"home", label:"Play", icon:"⚡" },
  { key:"progress", label:"Progress", icon:"🏆" },
  { key:"store", label:"Store", icon:"🛒" },
  { key:"governance", label:"Govern", icon:"🗳️" },
  { key:"profile", label:"Profile", icon:"👤" }
];

export function NavBar({ active, onNavigate }:{ active:NavKey; onNavigate:(k:NavKey)=>void }){
  return (
    <div style={{
      position:"sticky",
      bottom: 0,
      marginTop: 14,
      padding: 10,
      borderRadius: 18,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.10)",
      display:"flex",
      justifyContent:"space-between",
      gap: 6,
      backdropFilter:"blur(10px)"
    }}>
      {items.map(it => {
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            onClick={()=>onNavigate(it.key)}
            style={{
              flex:1,
              borderRadius: 14,
              border:"1px solid rgba(255,255,255,0.08)",
              background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.20))" : "transparent",
              color:"#F8FAFC",
              padding:"10px 8px",
              cursor:"pointer"
            }}
          >
            <div style={{fontSize:18, lineHeight:"18px"}}>{it.icon}</div>
            <div style={{fontSize:11, opacity:isActive?0.95:0.8, letterSpacing:0.6, textTransform:"uppercase"}}>{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}
