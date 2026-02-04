import React from "react";

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }){
  const s: React.CSSProperties = {
    borderRadius: 18,
    padding: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(10px)",
    ...style
  };
  return <div style={s}>{children}</div>;
}
