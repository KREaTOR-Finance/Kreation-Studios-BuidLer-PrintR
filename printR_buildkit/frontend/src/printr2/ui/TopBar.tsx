import React from "react";
import { Button } from "./Button";

export function TopBar(props: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
}){
  const left = props.left ?? (
    props.onBack ? <Button variant="ghost" onClick={props.onBack}>{props.backLabel ?? "Back"}</Button>
    : null
  );

  return (
    <header className="p2-top">
      <div className="p2-topSlot p2-topLeft">{left ?? <span />}</div>
      <div className="p2-topCenter">{props.center ?? null}</div>
      <div className="p2-topSlot p2-topRight">{props.right ?? <span />}</div>
    </header>
  );
}
