import React from "react";

export function Button(props: {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}){
  const v = props.variant ?? "primary";
  const cls = [
    "p2-btn",
    v === "primary" ? "p2-btnPrimary" : v === "secondary" ? "p2-btnSecondary" : "p2-btnGhost",
    props.className ?? ""
  ].join(" ");
  return (
    <button
      type={props.type ?? "button"}
      className={cls}
      onClick={props.onClick}
      disabled={props.disabled}
      style={props.disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
    >
      {props.children}
    </button>
  );
}
