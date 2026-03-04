import React from "react";

export function Panel(props: { className?: string; children: React.ReactNode; as?: "div" | "section" | "button"; onClick?: () => void }){
  const Tag: any = props.as ?? "div";
  return (
    <Tag className={["p2-panel", props.className ?? ""].join(" ")} onClick={props.onClick}>
      {props.children}
    </Tag>
  );
}
