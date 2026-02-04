import React from "react";
import { Card } from "../components/Card";
import { TopStats } from "../components/TopStats";
import { Button } from "../components/Button";
import type { GameAPI } from "../state/useGameMachine";

export function ResultScreen({ game }: { game: GameAPI }){
  const { state, acknowledgeResult } = game;
  const r = state.result!;
  const win = r.outcome === "WIN";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      <TopStats points={state.points} streak={state.streak} sessions={null} />
      <Card style={{
        border: `1px solid ${win ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.22)"}`,
        boxShadow: win ? "var(--glow-win)" : "var(--glow-loss)"
      }}>
        <div style={{
          fontFamily:"var(--font-display)",
          fontWeight: 900,
          letterSpacing: 1.8,
          fontSize: 46,
          color: win ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.92)"
        }}>
          {win ? "WIN!" : "MISS"}
        </div>

        <div style={{ marginTop: 6, opacity:0.92, fontWeight: 700 }}>
          {win ? `+${r.pointsDelta} POINTS` : "-1 TOKEN"}
        </div>

        <div style={{ marginTop: 10, opacity:0.85 }}>
          {r.reason}
        </div>

        <div style={{ height: 14 }} />
        <Button onClick={acknowledgeResult}>
          {win ? "Next Round" : "Try Again"}
        </Button>
      </Card>
    </div>
  );
}
