import React from "react";

export function Toggle(props: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
  className?: string;
}){
  return (
    <div className={["p2-toggle", props.className ?? ""].join(" ")}>
      {props.options.map((o) => {
        const on = props.value === o.key;
        return (
          <button
            key={o.key}
            className={["p2-toggleBtn", on ? "p2-toggleOn" : "p2-toggleOff"].join(" ")}
            onClick={() => props.onChange(o.key)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
