import React from "react";

type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
  subtitle?: string;
};

export function Card({ children, style, title, subtitle }: CardProps){
  const s: React.CSSProperties = {
    borderRadius: 18,
    padding: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(10px)",
    ...style
  };
  return (
    <div style={s}>
      {title ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{subtitle}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
