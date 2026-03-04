import React, { useEffect, useState } from "react";
import "./tokens.css";
import "./ui.css";
import "./screens.css";

/**
 * PrintR boot splash.
 * Always shows on launch, but is time-capped so it can't hang.
 */
export function BootSplash(props: { minMs?: number; maxMs?: number; onDone: () => void }){
  const minMs = props.minMs ?? 420;
  const maxMs = props.maxMs ?? 1100;
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setCanClose(true), minMs);
    const b = setTimeout(() => props.onDone(), maxMs);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [minMs, maxMs, props]);

  return (
    <div className="p2-root" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <div className="p2-noise" />
      <div className="p2-frame" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontWeight: 950,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            fontSize: 12,
            color: "rgba(234,242,255,.75)",
            marginBottom: 18
          }}>PrintR</div>

          <div style={{
            fontSize: 64,
            fontWeight: 950,
            letterSpacing: ".02em",
            lineHeight: 1,
            background: "linear-gradient(90deg, rgba(130,255,214,1), rgba(130,255,214,.55))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent"
          }}>PrintR</div>

          <div style={{
            marginTop: 10,
            fontSize: 12,
            letterSpacing: ".24em",
            textTransform: "uppercase",
            color: "rgba(234,242,255,.35)"
          }}>KREATION STUDIOS</div>

          <div style={{
            width: 120,
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,.08)",
            overflow: "hidden",
            margin: "26px auto 0"
          }}>
            <div style={{
              width: "55%",
              height: "100%",
              background: "rgba(130,255,214,.55)",
              boxShadow: "0 0 18px rgba(130,255,214,.25)",
              animation: "p2-warnPulse 1.1s ease-in-out infinite"
            }} />
          </div>

          {canClose ? (
            <button
              className="p2-btn p2-btnGhost"
              style={{ marginTop: 22, opacity: 0.65 }}
              onClick={props.onDone}
            >
              Enter
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
