import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Panel } from "./ui";
import { backendHttpBase } from "./net";

function abbr(wallet: string){
  if (!wallet) return "—";
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

export function PrintrLeaderboard(){
  const nav = useNavigate();
  const [rows, setRows] = useState<Array<{ wallet: string; totalScore: number }>>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const base = backendHttpBase();
    fetch(`${base}/api/leaderboard/all`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        if (!j?.ok) throw new Error(j?.error ?? "leaderboard_error");
        const list = Array.isArray(j.rows) ? j.rows : [];
        setRows(list.map((x: any) => ({ wallet: String(x.wallet ?? ""), totalScore: Number(x.totalScore ?? 0) })));
      })
      .catch((e) => { if (alive) setErr(String((e as any)?.message ?? e)); });

    return () => { alive = false; };
  }, []);

  const display = useMemo(() => rows.slice(0, 50), [rows]);

  return (
    <div className="p2-root">
      <div className="p2-noise" />
      <div className="p2-frame p2-gameFrame">
        <header className="p2-top">
          <Button variant="ghost" onClick={()=>nav("/")}>Home</Button>
          <div className="p2-topCenter">
            <div className="p2-mini">LEADERBOARD</div>
          </div>
          <div style={{ width: 72 }} />
        </header>

        <Panel className="p2-card">
          {err ? (
            <div className="p2-sub">{err}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {display.map((r, i) => (
                <div key={r.wallet + i} className="p2-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <div style={{ width: 28, fontWeight: 950, opacity: 0.8 }}>{i + 1}</div>
                    <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>{abbr(r.wallet)}</div>
                  </div>
                  <div style={{ fontWeight: 950, color: r.totalScore >= 0 ? "rgba(130,255,214,.95)" : "rgba(255,120,120,.95)" }}>
                    {r.totalScore >= 0 ? "+" : ""}{Math.round(r.totalScore)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
