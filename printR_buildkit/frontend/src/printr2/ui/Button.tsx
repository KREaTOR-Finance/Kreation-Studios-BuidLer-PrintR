import React from "react";

export function Button(props: {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
}){
  const v = props.variant ?? "primary";
  const cls = [
    "p2-btn",
    v === "primary" ? "p2-btnPrimary" : v === "secondary" ? "p2-btnSecondary" : "p2-btnGhost",
    props.className ?? ""
  ].join(" ");
  return (
    <button type={props.type ?? "button"} className={cls} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
