import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant="primary", style, ...rest }: Props){
  const base: React.CSSProperties = {
    width: "100%",
    height: variant === "primary" ? 56 : 52,
    borderRadius: 14,
    border: variant === "primary" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.10)",
    background: variant === "primary"
      ? "linear-gradient(135deg, rgba(59,130,246,0.92), rgba(139,92,246,0.92))"
      : "rgba(255,255,255,0.05)",
    boxShadow: variant === "primary" ? "var(--glow-blue)" : "none",
    color: "#F8FAFC",
    fontFamily: "var(--font-ui)",
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)"
  };

  return (
    <button
      {...rest}
      style={{ ...base, ...style }}
      onMouseDown={(e) => { (e.currentTarget as any).style.transform = "scale(0.96)"; rest.onMouseDown?.(e); }}
      onMouseUp={(e) => { (e.currentTarget as any).style.transform = "scale(1)"; rest.onMouseUp?.(e); }}
      onMouseLeave={(e) => { (e.currentTarget as any).style.transform = "scale(1)"; }}
    />
  );
}
