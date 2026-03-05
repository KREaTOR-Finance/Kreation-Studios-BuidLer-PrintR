import React from "react";

export function Panel(props: { className?: string; children: React.ReactNode; as?: "div" | "section" | "button"; onClick?: () => void; style?: React.CSSProperties }){
  const Tag: any = props.as ?? "div";
  return (
    <Tag className={["p2-panel", props.className ?? ""].join(" ")} onClick={props.onClick} style={props.style}>
      {props.children}
    </Tag>
  );
}
