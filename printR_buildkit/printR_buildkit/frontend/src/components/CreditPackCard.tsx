import React from "react";

export function CreditPackCard({ title, tokens, price, highlight, onBuy, disabled, busy }:{
  title:string;
  tokens:number;
  price:string;
  highlight?:string;
  onBuy:()=>void;
  disabled?:boolean;
  busy?:boolean;
}){
  return (
    <div style={{
      padding: 16, borderRadius: 18,
      background: highlight
        ? "linear-gradient(180deg, rgba(59,130,246,0.10), rgba(139,92,246,0.08))"
        : "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)"
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{fontWeight:900, letterSpacing:0.9}}>{title}</div>
        {highlight && <div style={{
          fontSize:11, padding:"6px 10px", borderRadius:999,
          background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.25)",
          color:"rgba(34,211,238,0.95)", fontWeight:900, letterSpacing:0.8
        }}>{highlight}</div>}
      </div>

      <div style={{display:"flex", justifyContent:"space-between", marginTop:12}}>
        <div>
          <div style={{fontSize:26, fontWeight:900}}>{tokens}</div>
          <div style={{opacity:0.8}}>SESSIONS</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:26, fontWeight:900}}>{price}</div>
          <div style={{opacity:0.8}}>USD</div>
        </div>
      </div>

      <button disabled={!!disabled} onClick={onBuy} style={{
        width:"100%", marginTop:12, height:52, borderRadius:14,
        border:"1px solid rgba(255,255,255,0.10)",
        background: disabled ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(59,130,246,0.92), rgba(139,92,246,0.92))",
        boxShadow: disabled ? "none" : "var(--glow-blue)",
        color:"#F8FAFC", fontWeight:900, letterSpacing:1.2, textTransform:"uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1
      }}>
        {busy ? "Opening Checkout..." : `Buy ${price}`}
      </button>
    </div>
  );
}
