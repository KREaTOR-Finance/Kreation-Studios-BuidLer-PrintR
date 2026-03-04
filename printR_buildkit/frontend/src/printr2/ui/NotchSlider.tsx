import React from "react";

export function NotchSlider(props: {
  label: string;
  value: number;
  notches: number[];
  onChange: (v: number) => void;
}){
  return (
    <div className="p2-commit">
      <div className="p2-commitTop">
        <div className="p2-mini">{props.label}</div>
        <div className="p2-commitValue">{props.value}</div>
      </div>
      <div className="p2-commitRow">
        {props.notches.map((n) => {
          const on = props.value === n;
          return (
            <button
              key={n}
              className={["p2-chip", on ? "p2-chipOn" : "p2-chipOff"].join(" ")}
              onClick={() => props.onChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
