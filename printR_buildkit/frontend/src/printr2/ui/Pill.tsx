import React from "react";

export function Pill(props: { tone: "live" | "warn" | "dead"; children: React.ReactNode }){
  const cls = props.tone === "live" ? "p2-pill p2-pillLive" : props.tone === "warn" ? "p2-pill p2-pillWarn" : "p2-pill p2-pillDead";
  return <div className={cls}>{props.children}</div>;
}
