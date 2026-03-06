import React from "react";

export function TopActions(props: { children: React.ReactNode; className?: string }){
  return <div className={["p2-topActions", props.className ?? ""].join(" ")}>{props.children}</div>;
}
